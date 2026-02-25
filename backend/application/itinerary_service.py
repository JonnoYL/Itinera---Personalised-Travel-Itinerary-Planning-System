from persistence.itinerary_repository import ItineraryRepository
from application.models.itinerary import ItineraryCreate, ItineraryResponse, ItineraryUpdate
from application.poi_service import POIService
from application.poi_relationship_service import POIRelationshipService
from application.user_service import UserService
from datetime import datetime, date, time, timedelta
from typing import List
from fastapi import HTTPException
from gurobipy import GRB
from .ors_service import get_route
import gurobipy as gp
import time as pytime


def time_to_minutes(t: time) -> float:
    return t.hour * 60 + t.minute

class ItineraryService:
    def __init__(self, poi_service: POIService, poi_relationship_service: POIRelationshipService, itinerary_repo: ItineraryRepository, user_service: UserService):
        self.user_service = user_service
        self.poi_service = poi_service
        self.poi_relationship_service = poi_relationship_service
        self.itinerary_repo = itinerary_repo

    def create_itinerary(self, itinerary_request: ItineraryCreate) -> ItineraryResponse:
        """
        Create a new itinerary instance and store the user's constraints in the database.

        This function only creates the itinerary metadata (budget, start/end times, POIs).
        It does NOT generate an optimised route — that is handled separately by the
        'generate itinerary' function.
        """

        # input validation
        if itinerary_request.budget < 0:
            raise HTTPException(
                status_code=400,
                detail="Budget cannot be less than 0"
            )

        if itinerary_request.end_time <= itinerary_request.start_time:
            raise HTTPException(
                status_code=400,
                detail="End time must be after start time"
            )

        if itinerary_request.date < date.today():
            raise HTTPException(
                status_code=400,
                detail="Date cannot be in the past"
            )

        # validate and retrieve user
        user = self.user_service.get_user_by_id(itinerary_request.user_id)
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with ID {itinerary_request.user_id} not found"
            )

        existing_pois = self.poi_service.get_all_pois()

        # create start POI (user-defined location)
        start_cat = itinerary_request.start_cat.split('.')[-1].replace('_', ' ').title()
        starting_poi = {
            "name": itinerary_request.start_name,
            "longitude": itinerary_request.start_long,
            "latitude": itinerary_request.start_lat,
            "opening_time": time(0, 0, 0),
            "closing_time": time(23, 59, 0),
            "category": [start_cat],
            "intrinsic_score": 0,
            "avg_visit_time": 0,
            "visit_cost": 0,
            "is_user_added": True
        }
        new_start = self.poi_service.create_poi(starting_poi)

        # create end POI (only for straight trips)
        new_end = None
        if itinerary_request.end_lat is not None:
            # straight trip: create end POI
            end_cat = itinerary_request.end_cat.split('.')[-1].replace('_', ' ').title()
            ending_poi = {
                "name": itinerary_request.end_name,
                "longitude": itinerary_request.end_long,
                "latitude": itinerary_request.end_lat,
                "opening_time": time(0, 0, 0),
                "closing_time": time(23, 59, 0),
                "category": [end_cat],
                "intrinsic_score": 0,
                "avg_visit_time": 0,
                "visit_cost": 0,
                "is_user_added": True
            }
            new_end = self.poi_service.create_poi(ending_poi)

        # create POI relationships for newly added POIs
        # this computes database edges
        #
        # new_start -> all existing POIs
        # existing POIs -> new_start
        #
        # new_end -> all existing POIs (if provided)
        # existing POIs -> new_end
        #
        # new_start <-> new_end (if both provided)
        if new_start or new_end:
            self.poi_relationship_service.create_poi_relationships(existing_pois, "driving-car", new_start, new_end)

        # persist itinerary metadata to database
        itinerary_dict = itinerary_request.model_dump()
        itinerary = self.itinerary_repo.create_itinerary(itinerary_dict)
        return itinerary

    def get_all_itineraries(self) -> List[ItineraryResponse]:
        """Retrieve all itineraries"""
        return self.itinerary_repo.get_all_itineraries()

    def get_itinerary_by_id(self, itinerary_id: int) -> ItineraryResponse:
        """Get itinerary by ID"""
        itinerary = self.itinerary_repo.get_itinerary_by_id(itinerary_id)
        if not itinerary:
            raise HTTPException(
                status_code=404, detail=f"Itinerary with ID {itinerary_id} not found"
            )
        return itinerary

    def get_itineraries_by_user(self, user_id: int) -> ItineraryResponse:
        """Get all user's itineraries"""
        itineraries = self.itinerary_repo.get_itineraries_by_user(user_id)
        # log count for visibility during integration
        print("User:", user_id, " Itinerary count:", len(itineraries))
        return itineraries

    def _prepare_itinerary_data(self, itinerary: ItineraryResponse):
        """
        Prepare and return a dictionary of precomputed data structures used
        by the optimisation model.
        """
        # load POIs and filter out user-added POIs (except start/end which will be re-added)
        all_pois = self.poi_service.get_all_pois()
        all_default_pois = [poi for poi in all_pois if not poi.is_user_added]

        # find starting POI
        starting_poi = next(poi for poi in all_pois if poi.name == itinerary.start_name)
        if starting_poi is None:
            raise HTTPException(500, "Start POI missing from POI dataset")

        # add starting POI if user-added
        if starting_poi.is_user_added:
            all_default_pois.append(starting_poi)

        # determine straight trip (has end POI) or round trip
        is_round_trip = True
        ending_poi = None
        if itinerary.end_name is not None:
            is_round_trip = False
            ending_poi = next((p for p in all_pois if p.name == itinerary.end_name), None)
            if ending_poi is None:
                raise HTTPException(500, "End POI missing from POI dataset")
            if ending_poi.is_user_added:
                all_default_pois.append(ending_poi)

        # categories, ids and utility
        all_categories = {category.lower() for poi in all_default_pois for category in poi.category}
        poi_categories = {poi.id: [category.lower() for category in poi.category] for poi in all_default_pois}
        poi_ids = [poi.id for poi in all_default_pois]
        utility_scores = {poi.id: poi.intrinsic_score for poi in all_default_pois}

        # costs, times, visit times built from relationships
        TAXI_COST_PER_M = 2.29 / 1000
        all_edges = self.poi_relationship_service.get_all_relationships()

        travel_distances = {(edge.from_poi_id, edge.to_poi_id): edge.distance_m for edge in all_edges}
        travel_costs = {(edge.from_poi_id, edge.to_poi_id): edge.distance_m * TAXI_COST_PER_M for edge in all_edges}
        travel_times = {(edge.from_poi_id, edge.to_poi_id): edge.duration_s / 60 for edge in all_edges}

        visit_costs = {poi.id: poi.visit_cost for poi in all_default_pois}
        visit_times = {poi.id: poi.avg_visit_time for poi in all_default_pois} # minutes

        opening_times = {poi.id: time_to_minutes(poi.opening_time) for poi in all_default_pois}
        closing_times = {poi.id: time_to_minutes(poi.closing_time) for poi in all_default_pois}

        time_budget = time_to_minutes(itinerary.end_time) - time_to_minutes(itinerary.start_time)

        return {
            "all_default_pois": all_default_pois,
            "starting_poi": starting_poi,
            "ending_poi": ending_poi,
            "is_round_trip": is_round_trip,
            "all_categories": all_categories,
            "poi_categories": poi_categories,
            "poi_ids": poi_ids,
            "utility_scores": utility_scores,
            "travel_distances": travel_distances,
            "travel_costs": travel_costs,
            "visit_costs": visit_costs,
            "taxi_cost_per_metre": TAXI_COST_PER_M,
            "travel_times": travel_times,
            "opening_times": opening_times,
            "closing_times": closing_times,
            "visit_times": visit_times,
            "time_budget": time_budget,
        }

    def _build_model(self, data, return_poi_id, poi_ids_with_return):
        """
        Construct Gurobi model, variables and objective (maximise utility).
        Returns the model and created variable dicts (y, z, p, arrival_time).
        """

        poi_ids = data["poi_ids"]

        m = gp.Model()

        # MODEL VARIABLES
        # indicator if POI i is selected
        y = m.addVars(poi_ids_with_return, vtype=GRB.BINARY, name="poi")
        # indicator for edges between POIs
        z = m.addVars(poi_ids_with_return, poi_ids_with_return, vtype=GRB.BINARY, name="edge")
        # position of each POI in sequence (continuous to speed up optimisation)
        p = m.addVars(poi_ids_with_return, vtype=GRB.CONTINUOUS, lb=1, ub=len(poi_ids_with_return), name="position")
        # arrival times of POIs (minutes from midnight)
        arrival_time = m.addVars(poi_ids_with_return, vtype=GRB.CONTINUOUS, name="arrival_time")

        # OBJECTIVE: maximise total utility of selected POIs
        m.setObjective(gp.quicksum(data["utility_scores"].get(i, 0) * y[i] for i in poi_ids_with_return), GRB.MAXIMIZE)

        # source and end constraints: source first, return last
        m.addConstr(p[data["starting_poi"].id] == 1, name="source_chosen_first")
        m.addConstr(p[return_poi_id] == len(poi_ids_with_return), name="end_chosen_last")

        # trip must depart from source to one vertex
        m.addConstr(gp.quicksum(z[data["starting_poi"].id, k] for k in poi_ids if k != data["starting_poi"].id) == 1, name="from_source")
        # trip goes back to end
        m.addConstr(y[return_poi_id] == 1, name="force_return_node_selected")
        # incoming/outgoing logic
        m.addConstr(gp.quicksum(z[j, return_poi_id] for j in poi_ids if j != data["starting_poi"].id) == 1, name="to_return_node")
        m.addConstr(gp.quicksum(z[return_poi_id, k] for k in poi_ids) == 0, name="no_out_from_return")

        return m, y, z, p, arrival_time

    def _add_constraints(self, m, y, z, p, arrival_time, data, itinerary, return_poi_id, poi_ids_with_return):
        """
        Add the main constraints to the model
        """
        poi_ids = data["poi_ids"]
        travel_costs = data["travel_costs"]
        travel_times = data["travel_times"]
        visit_costs = data["visit_costs"]
        visit_times = data["visit_times"]
        opening_times = data["opening_times"]
        closing_times = data["closing_times"]
        time_budget = data["time_budget"]
        starting_poi = data["starting_poi"]
        poi_categories = data["poi_categories"]

        # COST BUDGET: travelling fees + entrance fees ≤ cost budget
        m.addConstr(
            gp.quicksum(travel_costs.get((j, k)) * z[j, k] for j in poi_ids for k in poi_ids_with_return if j != k) +
            gp.quicksum(visit_costs[i] * y[i] for i in poi_ids_with_return) <= itinerary.budget,
            "cost_budget"
        )

        # TIME BUDGET: travelling times + visiting times ≤ time budget
        m.addConstr(
            gp.quicksum(travel_times.get((j, k)) * z[j, k] for j in poi_ids for k in poi_ids_with_return if j != k) +
            gp.quicksum(visit_times[i] * y[i] for i in poi_ids_with_return) <= time_budget,
            "time_budget"
        )

        # ARRIVAL TIMES: bounds and sequencing constraints
        for i in poi_ids_with_return:
            # arrival time is after opening time
            m.addConstr(arrival_time[i] >= opening_times[i], name = f"arrive_after_open_time_{i}")
            # arrival time is before closing time - visiting time
            m.addConstr(arrival_time[i] <= closing_times[i] - visit_times[i], name = f"arrive_before_close_time_{i}")

        m.addConstr(arrival_time[starting_poi.id] == time_to_minutes(itinerary.start_time))

        for j in poi_ids:
            for k in poi_ids_with_return:
                if j != k:
                    # if edge j -> k, then arrival time of j must be before arrival time of k
                    m.addConstr(
                        arrival_time[j] + (visit_times[j] + travel_times[j, k]) * z[j, k]
                        <= arrival_time[k] + 24 * 60 * (1 - z[j, k]),
                        name = f"arrive_at_{j}_before_{k}"
                    )

        # CATEGORY constraint (if categories were requested)
        if itinerary.categories:
            selected_categories = {c.lower() for c in itinerary.categories}
            non_terminal_pois = [i for i in poi_ids if i not in {starting_poi.id, return_poi_id}]
            selected_non_terminal = [i for i in non_terminal_pois if any(cat in selected_categories for cat in poi_categories[i])]

            # more than half of the visited POIs, excluding start and end, must be from user-selected categories.
            if len(non_terminal_pois) > 0 and len(selected_non_terminal) > 0:
                m.addConstr(
                    gp.quicksum(y[i] for i in selected_non_terminal) * 2
                    >= gp.quicksum(y[i] for i in non_terminal_pois) + 1,
                    name="majority_selected_categories"
                )

        # FLOW CONSERVATION
        # if node i is visted, there must be one edge to that node j -> i (excluding the starting POI)
        m.addConstrs((gp.quicksum(z[j, i] for j in poi_ids if j != i) == y[i] for i in poi_ids if i != starting_poi.id), name="flow_in")

        if data["is_round_trip"]:
            # if node i is visted, there must be one edge from that node i -> k
            m.addConstrs((gp.quicksum(z[i, k] for k in poi_ids_with_return if k != i) == y[i] for i in poi_ids), name="flow_out_round_trip")
        else:
            # every visited node except the end node has one outgoing edge
            m.addConstrs((gp.quicksum(z[i, k] for k in poi_ids_with_return if k != i) == y[i] for i in poi_ids if i != return_poi_id), name="flow_out_straight")

        # SUBTOUR ELIMINATION (MTZ)
        for i in poi_ids_with_return:
            for j in poi_ids_with_return:
                if i != j:
                    m.addConstr(p[i] - p[j] + len(poi_ids_with_return) * z[i, j] <= len(poi_ids_with_return) - 1,
                                name=f"mtz_{i}_{j}")

    def _solve_and_extract(self, m, y, p, arrival_time, data, itinerary, return_poi_id, poi_ids_with_return):
        """
        Runs the model, handles statuses, and extracts the itinerary details
        into the format expected by the rest of the service.
        """
        start = pytime.time()
        m.optimize()
        print("GUROBI SOLVE DONE IN", pytime.time() - start)

        if m.status == GRB.INFEASIBLE:
            # find minimal set of conflicting constraints (if one constraint is removed, model is feasible)
            m.computeIIS()

            # constraints
            violated_constraints = [c.ConstrName for c in m.getConstrs() if c.IISConstr]
            print(violated_constraints)

            error_message = "An itinerary cannot be made given the provided information"
            for name in violated_constraints:
                if "cost_budget" in name:
                    error_message = "Budget is too low to cover visiting and travel costs"
                elif "time_budget" in name:
                    error_message = "Itinerary cannot be generated given the start and end time"

            raise HTTPException(status_code=400, detail=error_message)

        # ff optimal, collect results
        selected_pois = [i for i in poi_ids_with_return if y[i].X > 0.5]
        poi_positions = {i: p[i].X for i in selected_pois}

        # sort the POIs by ascending positions
        sorted_pois = sorted(poi_positions, key=lambda i: poi_positions[i])
        print(f'Itinerary POI sequence: {sorted_pois}')

        # build itinerary details (times, distances, costs)
        all_default_pois = data["all_default_pois"]
        travel_distances = data["travel_distances"]
        travel_times = data["travel_times"]
        travel_costs = data["travel_costs"]

        curr_time = datetime.combine(datetime.today(), itinerary.start_time)
        total_time = 0.0
        total_cost = 0.0
        total_distance = 0.0
        total_score = 0.0
        poi_details = []
        previous_poi = data["starting_poi"]
        order_index = 0
        pois_sequence = []
        mode_per_leg = []

        for poi_id in sorted_pois:
            # for round trip the return node maps to starting_poi
            if data["is_round_trip"] and poi_id == return_poi_id:
                poi_id = data["starting_poi"].id

            poi = next(p for p in all_default_pois if p.id == poi_id)

            print(f"{order_index}: {poi.name}")

            pois_sequence.append({
                "id": poi.id,
                "name": poi.name,
                "category": poi.category,
                "lat": poi.latitude,
                "lon": poi.longitude
            })

            distance_m = travel_distances.get((previous_poi.id, poi.id), 0)
            travel_time = travel_times.get((previous_poi.id, poi.id), 0)
            travel_cost = travel_costs.get((previous_poi.id, poi.id), 0)

            # update times
            curr_time += timedelta(minutes=travel_time)
            arrival_ts = curr_time
            curr_time += timedelta(minutes=poi.avg_visit_time)
            departure_ts = curr_time

            poi_details.append({
                "poi_id": poi.id,
                "order_index": order_index,
                "arrival_time": arrival_ts,
                "departure_time": departure_ts,
                "travel_time_from_prev": travel_time,
                "travel_distance_from_prev": distance_m,
            })

            total_time += travel_time + poi.avg_visit_time
            total_cost += travel_cost + poi.visit_cost
            total_distance += distance_m
            total_score += poi.intrinsic_score

            previous_poi = poi
            order_index += 1

        for i in range(len(pois_sequence) - 1):
            mode_per_leg.append("driving-car")

        # FETCH ROUTE FROM EXTERNAL SERVICE (ORS)
        route_feature_collection = get_route(pois_sequence, mode_per_leg, data["travel_distances"], data["travel_times"])

        # update DB statistics and return latest itinerary
        self.itinerary_repo.update_itinerary_stats(
            itinerary.id,
            total_time,
            total_cost,
            total_distance,
            total_score,
            poi_details,
            route_feature_collection
        )

        generated_itinerary = self.itinerary_repo.get_itinerary_by_id(itinerary.id)
        return generated_itinerary

    def generate_itinerary(self, itinerary_id: int) -> ItineraryResponse:
        """
        Orchestrates the generation pipeline.
        """
        itinerary = self.get_itinerary_by_id(itinerary_id)

        data = self._prepare_itinerary_data(itinerary)
        poi_ids = data["poi_ids"]

        # if round trip, create synthetic return node and extend data structures
        if data["is_round_trip"]:
            return_poi_id = max(poi_ids) + 1
            poi_ids_with_return = poi_ids + [return_poi_id]

            # extend per-node dictionaries for the return node using start POI's values
            data["utility_scores"][return_poi_id] = 0
            data["visit_costs"][return_poi_id] = 0
            data["visit_times"][return_poi_id] = 0
            data["opening_times"][return_poi_id] = time_to_minutes(data["starting_poi"].opening_time)
            data["closing_times"][return_poi_id] = time_to_minutes(data["starting_poi"].closing_time)

            # set travel times/costs for links to return node from each poi (use safe fallback of 0)
            for poi_id in poi_ids:
                data["travel_costs"][(poi_id, return_poi_id)] = data["travel_costs"].get((poi_id, data["starting_poi"].id), 0)
                data["travel_times"][(poi_id, return_poi_id)] = data["travel_times"].get((poi_id, data["starting_poi"].id), 0)

        else:
            return_poi_id = data["ending_poi"].id
            poi_ids_with_return = poi_ids

        # build, add constraints, solve and extract results
        m, y, z, p, arrival_time = self._build_model(data, return_poi_id, poi_ids_with_return)
        self._add_constraints(m, y, z, p, arrival_time, data, itinerary, return_poi_id, poi_ids_with_return)
        return self._solve_and_extract(m, y, p, arrival_time, data, itinerary, return_poi_id, poi_ids_with_return)

    def update_itinerary(self, itinerary_id: int, update_data: ItineraryUpdate):
        """
        Updates start time, end time and or budget of an itinerary and
        regenerates the itinerary based on new constraints.

        Validates the budget and time constraints before applying updates.
        After updating, triggers a full itinerary regeneration.
        """
        itinerary = self.get_itinerary_by_id(itinerary_id)
        update_dict = update_data.model_dump(exclude_unset=True)

        # validate budget
        if "budget" in update_dict and update_dict["budget"] < 0:
            raise HTTPException(
                status_code=400,
                detail="Budget cannot be less than 0"
            )

        # validate times
        start_time = update_dict.get("start_time", itinerary.start_time)
        end_time = update_dict.get("end_time", itinerary.end_time)
        if end_time <= start_time:
            raise HTTPException(
                status_code=400,
                detail="End time must be after start time"
            )

        try:
            # update fields in database
            self.itinerary_repo.update_itinerary_fields(itinerary_id, update_data)
            # regenerate itinerary with updated fields
            generated = self.generate_itinerary(itinerary_id)
            return generated
        except HTTPException as e:
            # if regeneration fails, propagate the error
            raise e

    def delete_itinerary(self, itinerary_id: int):
        """Delete itinerary from database"""
        deleted = self.itinerary_repo.delete_itinerary(itinerary_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete itinerary")
        return True
