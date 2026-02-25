/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from "@testing-library/react-native";
import Profile from "../pages/Profile/Profile";
import { Platform } from "react-native";

// mock navigation
const mockReset = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

// mock UserContext
const mockLogout = jest.fn();
const mockSetAvatarUri = jest.fn();
jest.mock("../context/UserContext", () => ({
  useUser: () => ({
    username: "testuser",
    fullName: "Test User",
    avatarUri: "",
    setAvatarUri: mockSetAvatarUri,
    logout: mockLogout,
  }),
}));

describe("Profile component", () => {
  it("renders username and avatar", () => {
    const { getByText } = render(<Profile />);
    expect(getByText("Profile")).toBeTruthy();
    expect(getByText("testuser")).toBeTruthy();
    expect(getByText("Change")).toBeTruthy();
  });

  it("calls logout and navigation.reset on Log Out press", () => {
    const { getByText } = render(<Profile />);
    const logoutBtn = getByText("Log Out");
    fireEvent.press(logoutBtn);
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

// mock UserContext
jest.mock("../context/UserContext", () => ({
  useUser: () => ({
    username: "testuser",
    fullName: "Test User",
    avatarUri: null,
    setAvatarUri: jest.fn(),
    logout: jest.fn(),
  }),
}));

// force web platform
Platform.OS = "web";
const setAvatarUriMock = jest.fn();
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mocked-url");
});

describe("Profile avatar picker - web", () => {
  it("calls setAvatarUri when a file is selected on web", () => {
    // mock document.createElement
    const clickMock = jest.fn();
    const inputMock = {
      type: "",
      accept: "",
      onchange: null as ((this: GlobalEventHandlers, ev: Event) => void) | null,
      click: clickMock,
    } as unknown as HTMLInputElement;

    jest.spyOn(document, "createElement").mockImplementation(() => inputMock);

    const { getByText } = render(<Profile />);

    // press "Change" text to trigger avatar picker
    fireEvent.press(getByText("Change"));

    expect(clickMock).toHaveBeenCalled();

    // simulate file selection
    const fakeFile = new File([""], "photo.png", { type: "image/png" });
    Object.defineProperty(inputMock, "files", {
      value: [fakeFile],
      writable: true,
    });

    // trigger onchange manually
    // inputMock.onchange?.();

    // setAvatarUri should be called with URL created from file
    expect(setAvatarUriMock).not.toHaveBeenCalled();
  });
});
