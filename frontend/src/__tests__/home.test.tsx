// // mocks first

// jest.mock('react-native-maps', () => {
//   const React = require('react');
//   const { View } = require('react-native');

//   const MockMapView = (props: any) => <View {...props}>{props.children}</View>;
//   const MockMarker = (props: any) => <View {...props} />;
//   const MockPolyline = (props: any) => <View {...props} />;

//   return {
//     __esModule: true,
//     default: MockMapView,
//     Marker: MockMarker,
//     Polyline: MockPolyline,
//     PROVIDER_GOOGLE: 'google',
//   };
// });

// jest.mock('@expo/vector-icons/Ionicons', () => {
//   const React = require('react');
//   const { View } = require('react-native');
//   return (props: any) => <View {...props} />;
// });

// jest.mock('../lib/api');
// jest.mock('@react-navigation/native');
// jest.mock('react-native-safe-area-context', () => {
//   const React = require('react');
//   const { View } = require('react-native');
//   return {
//     SafeAreaProvider: (props: any) => <View {...props} />,
//     useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
//   };
// });

// // imports
// import React from 'react';
// import { render, fireEvent, waitFor } from '@testing-library/react-native';
// import Home from '../pages/Home/Home';
// import { apiGetItineraries } from '../lib/api';
// import { useNavigation } from '@react-navigation/native';
// import { SafeAreaProvider } from 'react-native-safe-area-context';

// const mockNavigate = jest.fn();

// beforeEach(() => {
//   jest.clearAllMocks();
//   (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
// });

// const fakeItineraries = [
//   {
//     id: 1,
//     name: "Sydney Trip",
//     feature_collection: {
//       type: "FeatureCollection",
//       features: [
//         {
//           type: "Feature",
//           geometry: {
//             type: "LineString",
//             coordinates: [
//               [151.2093, -33.8688],
//               [151.215, -33.870],
//             ],
//           },
//         },
//       ],
//     },
//     pois: [
//       {
//         id: 101,
//         poi: { latitude: -33.8688, longitude: 151.2093, name: "Opera House" },
//       },
//     ],
//     date: "2025-11-23",
//     start_time: "09:00:00",
//     end_time: "17:00:00",
//     categories: ["Sightseeing"],
//     cover_photos: ["https://example.com/photo.jpg"],
//   },
// ];

// describe("Home integration", () => {
//   // will add more
//   // i think they are making changes to it

//   it("renders zoom buttons and toggles map type", () => {
//     const { getByText } = render(<Home />);
//     const zoomInBtn = getByText("+");
//     const zoomOutBtn = getByText("−");

//     expect(zoomInBtn).toBeTruthy();
//     expect(zoomOutBtn).toBeTruthy();

//   });
// });

describe("home to be added", () => {
  it("adds 1 + 1 correctly", () => {
    expect(1 + 1).toBe(2);
  });
});
