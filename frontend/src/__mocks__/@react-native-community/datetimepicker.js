const React = require("react");
const { View, Text } = require("react-native");

const MockDateTimePicker = ({ value, onChange, mode, ...props }) => {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { testID: "mock-datetimepicker" }, mode)
  );
};

module.exports = MockDateTimePicker;
