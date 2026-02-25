/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react-native";
import ProfileStack from "../pages/Profile/ProfileStack";
import { NavigationContainer } from "@react-navigation/native";

// mock profile
// jest.mock("../pages/Profile/Profile", () => {
//   return () => <div testID="mocked-profile" />;
// });

// mock react-navigation native
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      reset: jest.fn(),
    }),
  };
});

describe("ProfileStack", () => {
  it("renders Profile screen in the stack", () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <ProfileStack />
      </NavigationContainer>,
    );
    expect(getByTestId("mocked-profile")).toBeTruthy();
  });
});
