/**
 * @jest-environment jsdom
 */
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ItinerariesList from "../pages/Home/ItinerariesList";
import * as api from "../lib/api";
import { UserProvider } from "../context/UserContext";
// import { SafeAreaProvider } from "react-native-safe-area-context";

// import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
// jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// --- Mocks ---
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn(),
}));

const mockDeleteItinerary = jest.fn();
jest.mock("../context/ItineraryContext", () => ({
  useItineraries: () => ({ deleteItinerary: mockDeleteItinerary }),
}));

jest.mock("@expo/vector-icons/Ionicons", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require("react-native");
    return <View {...props} />;
  },
}));

jest.mock("../lib/api");

function renderWithProviders(ui: React.ReactElement) {
  return render(<UserProvider>{ui}</UserProvider>);
}

describe("ItinerariesList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing", () => {
    // placeholder test to satisfy Jest
    expect(true).toBe(true);
  });

  it("renders placeholder when no itineraries", async () => {
    (api.apiGetItineraries as jest.Mock).mockResolvedValueOnce([]);
    const { getByText } = renderWithProviders(<ItinerariesList />);

    await waitFor(() =>
      expect(getByText("No itineraries yet — create one")).toBeTruthy(),
    );
  });

  it("renders backend itineraries and navigates on new button press", async () => {
    (api.apiGetItineraries as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        name: "Trip 1",
        description: "string",
        date: new Date().toISOString(),
        cover_photos: ["string"],
        budget: 500,
        start_time: "10:00:00.000Z",
        end_time: "22:00:00.000Z",
        start_lat: -33.84791615,
        start_long: 151.0676002021898,
        start_name: "Novotel",
        start_cat: "accomodation.hotel",
        user_id: 1,
      },
      {
        id: 2,
        name: "Trip 2",
        description: "string",
        date: new Date().toISOString(),
        cover_photos: ["string"],
        budget: 500,
        start_time: "10:00:00.000Z",
        end_time: "22:00:00.000Z",
        start_lat: -33.84791615,
        start_long: 151.0676002021898,
        start_name: "Novotel",
        start_cat: "accomodation.hotel",
        user_id: 1,
      },
    ]);

    const { getByText } = renderWithProviders(<ItinerariesList />);

    await waitFor(() => {
      expect(getByText("Trip 1")).toBeTruthy();
      expect(getByText("Trip 2")).toBeTruthy();
    });

    fireEvent.press(getByText("+ New Itinerary"));
    expect(mockNavigate).toHaveBeenCalledWith("NewItinerary");
  });

  it("trip is rendered as well as details", async () => {
    (api.apiGetItineraries as jest.Mock).mockResolvedValueOnce([
      {
        id: 1,
        name: "Trip 1",
        description: "string",
        date: new Date().toISOString(),
        cover_photos: ["string"],
        budget: 500,
        start_time: "10:00:00.000Z",
        end_time: "22:00:00.000Z",
        start_lat: -33.84791615,
        start_long: 151.0676002021898,
        start_name: "Novotel",
        start_cat: "accomodation.hotel",
        user_id: 1,
      },
    ]);
    (api.apiDeleteItinerary as jest.Mock).mockResolvedValueOnce(true);

    const { getByText } = renderWithProviders(<ItinerariesList />);

    await waitFor(() => getByText("Trip 1"));

    await fireEvent.press(getByText("Trip 1"));
    // expect to see trip details
    expect(getByText("Trip 1")).toBeTruthy();
    expect(getByText("$0 / $500")).toBeTruthy();
    expect(getByText("Novotel")).toBeTruthy();
  });
});
