import { act } from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { UserProvider } from "../context/UserContext";
import { Alert, Modal } from "react-native";

jest.useRealTimers();
// mock the navigation and auth service
jest.mock("../services/auth");
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({ replace: jest.fn(), navigate: jest.fn() })),
}));

jest.spyOn(Alert, "alert").mockImplementation(() => {});

jest.mock("react-native-safe-area-context", () => {
  return {
    SafeAreaProvider: ({ children }: React.PropsWithChildren) => (
      <>{children}</>
    ),
    SafeAreaView: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

import Login from "../pages/Auth/Login";
import SignUp from "../pages/Auth/SignUp";
import HelpPopUp from "../components/UI/HelpPopUp";

describe("Login component real timer", () => {
  test("shows help pop-up when Help button is pressed", async () => {
    const { getByRole, findByText } = render(
      <UserProvider>
        <Login />
      </UserProvider>,
    );

    // help button exists
    const helpButton = getByRole("button", { name: "Help" });
    expect(helpButton).toBeTruthy();

    // press Help button
    await act(async () => {
      fireEvent.press(helpButton);
    });

    // assert that some content inside the modal appears
    expect(findByText("Forgot your password?")).toBeTruthy();
    expect(findByText("Forgot your username?")).toBeTruthy();
    expect(findByText("Other tips:")).toBeTruthy();
  });
});

describe("Sign up component real timer", () => {
  test("sign up shows help pop-up when Help button is pressed", async () => {
    const { getByRole, findByText } = render(
      <UserProvider>
        <SignUp />
      </UserProvider>,
    );

    // help button exists
    const helpButton = getByRole("button", { name: "Help" });
    expect(helpButton).toBeTruthy();

    // press Help button
    await act(async () => {
      fireEvent.press(helpButton);
    });

    // assert that some content inside the modal appears
    expect(findByText("Forgot your password?")).toBeTruthy();
    expect(findByText("Forgot your username?")).toBeTruthy();
    expect(findByText("Other tips:")).toBeTruthy();
  });
});

describe("Sign up component real timer", () => {
  test("calls setModalVisible when Close button is pressed", () => {
    const setModalVisible = jest.fn();

    const { getByText } = render(
      <HelpPopUp modalVisible={true} setModalVisible={setModalVisible} />,
    );

    const closeButton = getByText("Close");
    fireEvent.press(closeButton);
    expect(setModalVisible).toHaveBeenCalledWith(false);
  });
  test("calls Alert.alert and setModalVisible when modal is closed", () => {
    const setModalVisible = jest.fn();

    const { UNSAFE_getByType } = render(
      <HelpPopUp modalVisible={true} setModalVisible={setModalVisible} />,
    );

    const modal = UNSAFE_getByType(Modal);

    // simulate OS closing the modal (onRequestClose)
    modal.props.onRequestClose();

    expect(Alert.alert).toHaveBeenCalledWith("Modal has been closed.");
    expect(setModalVisible).toHaveBeenCalledWith(false);
  });
});
