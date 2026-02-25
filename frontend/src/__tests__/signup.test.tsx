import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { UserProvider } from "../context/UserContext";
import { act } from "react";
import SignUp from "../pages/Auth/SignUp";
import { signUpWithUsernamePassword } from "../services/auth";
import { NavigationContainer } from "@react-navigation/native";

// mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
    }),
  };
});

jest.mock("../services/auth");

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

describe("Signup component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test("Text renders correctly on SignUp screen", () => {
    const { getByPlaceholderText, getByRole } = render(
      <NavigationContainer>
        <UserProvider>
          <SignUp />
        </UserProvider>
      </NavigationContainer>,
    );

    // look for button with the accessible name "SignUp"
    const loginButton = getByRole("button", { name: "Sign Up" });

    expect(loginButton).toBeTruthy();

    expect(getByPlaceholderText("Username")).toBeTruthy();
    expect(getByPlaceholderText("Confirm Password")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
  });

  test("not login when confirm password does not equal password", async () => {
    (signUpWithUsernamePassword as jest.Mock).mockResolvedValueOnce({
      token: "abc123",
    });
    const { getByPlaceholderText, getByRole, getByText } = render(
      <NavigationContainer>
        <UserProvider>
          <SignUp />
        </UserProvider>
      </NavigationContainer>,
    );
    const usernameInput = getByPlaceholderText("Username");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");

    // enter username + password, then wait
    // React state updates are async
    // pressing Login in the same tick can capture "" values in the handler
    await act(async () => {
      fireEvent.changeText(usernameInput, "user");
      fireEvent.changeText(passwordInput, "notthesame");
      fireEvent.changeText(confirmPasswordInput, "same");
    });

    await waitFor(() => {
      expect(usernameInput.props.value).toBe("user");
      expect(passwordInput.props.value).toBe("notthesame");
      expect(confirmPasswordInput.props.value).toBe("same");
    });

    // press Login after inputs reflect the new values
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Sign Up" }));
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText("Passwords do not match")).toBeTruthy();
  });
  test("navigates to MainTabs after successful signup", async () => {
    (signUpWithUsernamePassword as jest.Mock).mockResolvedValueOnce({
      token: "abc123",
    });

    const { getByPlaceholderText, getByRole } = render(
      <UserProvider>
        <SignUp />
      </UserProvider>,
    );

    const usernameInput = getByPlaceholderText("Username");
    const passwordInput = getByPlaceholderText("Password");
    const confirmPasswordInput = getByPlaceholderText("Confirm Password");

    await act(async () => {
      fireEvent.changeText(usernameInput, "pillow");
      fireEvent.changeText(passwordInput, "willowpillow");
      fireEvent.changeText(confirmPasswordInput, "willowpillow");
    });

    await waitFor(() => {
      expect(usernameInput.props.value).toBe("pillow");
      expect(passwordInput.props.value).toBe("willowpillow");
      expect(confirmPasswordInput.props.value).toBe("willowpillow");
    });

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Sign Up" }));
    });

    expect(signUpWithUsernamePassword).toHaveBeenCalledWith(
      "pillow",
      "willowpillow",
    );

    await act(async () => {
      jest.runAllTimers();
    });

    // check navigation to MainTabs (home page)
    expect(mockReplace).toHaveBeenCalledWith("MainTabs");
  });

  test("shows error for short password", async () => {
    (signUpWithUsernamePassword as jest.Mock).mockResolvedValueOnce(null);

    const { getByPlaceholderText, getByRole, getByText } = render(
      <UserProvider>
        <SignUp />
      </UserProvider>,
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText("Username"), "shortuser");
      fireEvent.changeText(getByPlaceholderText("Password"), "123");
      fireEvent.changeText(getByPlaceholderText("Confirm Password"), "123");
    });

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Sign Up" }));
    });

    await waitFor(() => {
      expect(
        getByText("Password cannot be less than 8 characters"),
      ).toBeTruthy();
    });
  });

  test("shows error when username is taken", async () => {
    (signUpWithUsernamePassword as jest.Mock).mockResolvedValueOnce(null);

    const { getByPlaceholderText, getByRole, getByText } = render(
      <UserProvider>
        <SignUp />
      </UserProvider>,
    );

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText("Username"), "existinguser");
      fireEvent.changeText(getByPlaceholderText("Password"), "validpassword");
      fireEvent.changeText(
        getByPlaceholderText("Confirm Password"),
        "validpassword",
      );
    });

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Sign Up" }));
    });

    await waitFor(() => {
      expect(getByText("Username is taken")).toBeTruthy();
    });
  });
});
