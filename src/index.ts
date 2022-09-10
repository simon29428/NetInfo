import "./style.css";
import * as jsPlumbBrowserUI from "@jsplumb/browser-ui";
import { ContainmentType } from "@jsplumb/browser-ui";
import { BlankEndpoint } from "@jsplumb/core";
import { mdiMagnify } from "@mdi/js";

let instance;

console.log(mdiMagnify);

function getMdiTemplate(mdiStr: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="24" height="24">
      <g><path fill="#000000" d="${mdiStr}"/></g>
    </svg>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#search_btn").innerHTML = getMdiTemplate(mdiMagnify);
});

jsPlumbBrowserUI.ready(() => {
  const container = document.querySelector("#container");

  instance = jsPlumbBrowserUI.newInstance({
    container: container,
    connectionsDetachable: false,
    dragOptions: { containment: ContainmentType.parentEnclosed },
  });

  instance.manage(container);

  instance.connect({
    source: document.querySelector("#ep1"),
    target: document.querySelector("#ep2"),
    endpointStyle: BlankEndpoint,
    anchors: ["AutoDefault", "AutoDefault"],
    connector: {
      type: "Straight",
      options: { stub: 30 },
    },
    overlays: [{ type: "Arrow", options: { location: 1 } }],
  });

  instance.connect({
    source: document.querySelector("#ep1"),
    target: document.querySelector("#ep3"),
    endpointStyle: BlankEndpoint,
    anchors: ["AutoDefault", "AutoDefault"],
    connector: {
      type: "Straight",
      options: { stub: 30 },
    },
    overlays: [{ type: "Arrow", options: { location: 1 } }],
  });

  instance.connect({
    source: document.querySelector("#ep1"),
    target: document.querySelector("#ep4"),
    endpointStyle: BlankEndpoint,
    anchors: ["AutoDefault", "AutoDefault"],
    connector: {
      type: "Straight",
      options: { stub: 30 },
    },
    overlays: [{ type: "Arrow", options: { location: 1 } }],
  });
});
