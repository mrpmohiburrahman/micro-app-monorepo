import Svg, { Path } from "react-native-svg";

import React from "react";
import { SvgProps } from "./types";

export const SendMoney = ({ color = "#5f6368" }: SvgProps) => (
  <Svg height="24px" viewBox="0 -960 960 960" width="24px" fill={color}>
    <Path d="M240-170Q136-197 68-282T0-480q0-113 68-198t172-112v84q-71 24-115.5 86T80-480q0 78 44.5 140T240-254v84Zm320 10q-133 0-226.5-93.5T240-480q0-133 93.5-226.5T560-800q66 0 124 25t102 69l-56 56q-33-33-76.5-51.5T560-720q-100 0-170 70t-70 170q0 100 70 170t170 70q50 0 93.5-18.5T730-310l56 56q-44 44-102 69t-124 25Zm240-160-56-56 64-64H520v-80h288l-64-64 56-56 160 160-160 160Z" />
  </Svg>
);