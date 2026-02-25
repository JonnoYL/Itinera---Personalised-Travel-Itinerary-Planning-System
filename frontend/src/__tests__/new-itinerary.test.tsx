// // mock navigation
// const mockNavigate = jest.fn();
// const mockReplace = jest.fn();
// jest.mock("@react-navigation/native", () => {
//   const actualNav = jest.requireActual("@react-navigation/native");
//   return {
//     ...actualNav,
//     useNavigation: () => ({
//       navigate: mockNavigate,
//       replace: mockReplace,
//     }),
//   };
// });

// jest.mock("@react-native-community/datetimepicker", () => {
//   return jest.requireActual(
//     "../__mocks__/@react-native-community/datetimepicker",
//   );
// });

// jest.mock("@expo/vector-icons/Ionicons", () => {
//   return {
//     __esModule: true,
//     default: (props: any) => {
//       const { View } = require("react-native"); // import inside factory
//       return <View {...props} />;
//     },
//   };
// });

// import { render, fireEvent } from "@testing-library/react-native";
// import NewItinerary from "../pages/Itinerary/NewItinerary";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { View } from "react-native";

// test.skip("renders categories modal", () => {
//   const { getByText, debug, getByRole } = render(
//     <SafeAreaProvider>
//       <NewItinerary compact={true} />
//     </SafeAreaProvider>,
//   );

//   debug(); // should now show modal content

//   const categoriesBtn = getByRole("button", { name: /Select categories/i });
//   fireEvent.press(categoriesBtn);

//   // Now the modal should appear
//   expect(getByText("Select Categories")).toBeTruthy();
//   expect(getByText("Done")).toBeTruthy();

//   debug();
// });

describe("new itinerary to be added", () => {
  it("adds 1 + 1 correctly", () => {
    expect(1 + 1).toBe(2);
  });
});
