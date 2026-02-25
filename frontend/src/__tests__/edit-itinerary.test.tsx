import React from "react";
import { render } from "@testing-library/react-native";
import EditItinerary from "../pages/Home/EditItinerary";

describe("EditItinerary component", () => {
  it("renders correctly", () => {
    const { getByText } = render(<EditItinerary />);
    expect(getByText("EditItinerary")).toBeTruthy();
  });
});
