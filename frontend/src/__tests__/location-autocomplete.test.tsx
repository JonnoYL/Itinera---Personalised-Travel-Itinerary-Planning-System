import { render, fireEvent, waitFor } from "@testing-library/react-native";
import LocationAutocomplete from "../components/UI/LocationAutocomplete";

global.fetch = jest.fn();

describe("LocationAutocomplete", () => {
  const mockOnInputChange = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows suggestions and selects an item (happy path)", async () => {
    const fakeResults = {
      results: [
        {
          formatted: "Sydney NSW, Australia",
          name: "Sydney",
          lat: -33.865143,
          lon: 151.2099,
          categories: ["place.city", "continent.oceania"],
        },
      ],
    };

    (fetch as jest.Mock).mockResolvedValue({
      json: async () => fakeResults,
    });

    const { getByTestId, getByText, queryByText } = render(
      <LocationAutocomplete
        label="Location"
        input="Syd"
        onInputChange={mockOnInputChange}
        onSelect={mockOnSelect}
        testID="location-input"
      />,
    );

    const input = getByTestId("location-input");

    fireEvent.changeText(input, "Syd");

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(getByText("Sydney")).toBeTruthy();
    });

    const suggestion = getByText("Sydney");
    fireEvent.press(suggestion);

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Sydney",
        lat: -33.865143,
        lon: 151.2099,
      }),
    );

    expect(mockOnInputChange).toHaveBeenCalledWith("Sydney NSW, Australia");

    // dropdown closes
    await waitFor(() => {
      expect(queryByText("Sydney")).toBeNull();
    });
  });
});
