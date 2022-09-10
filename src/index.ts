import "./style.css";
import * as jsPlumbBrowserUI from "@jsplumb/browser-ui";
import { ContainmentType, BrowserJsPlumbInstance } from "@jsplumb/browser-ui";
import { BlankEndpoint } from "@jsplumb/core";
import { mdiMagnify } from "@mdi/js";
import { load } from "js-yaml";

import { MdiIcon, NodeGroup, NodeGroupItem } from "./ui-components";
import { InfoTree, InfoNode } from "./interface";

let instance: BrowserJsPlumbInstance;

const resizeObserver = new ResizeObserver(() => {
  instance?.repaintEverything();
});

customElements.define("node-group", NodeGroup);
customElements.define("node-group-item", NodeGroupItem);

customElements.define("mdi-icon", MdiIcon);

function calcDepth(tree: Record<string, InfoNode>, key: string, depth: number): number {
  let md = depth;
  tree[key].depth = tree[key].depth || depth;
  tree[key].connections?.forEach((conn) => {
    md = Math.max(calcDepth(tree, conn.to, depth + 1), md);
  });
  return md;
}

document.addEventListener("DOMContentLoaded", () => {
  (document.querySelector("#search_btn") as MdiIcon).icon = mdiMagnify;

  (document.querySelector("#upload_file") as HTMLInputElement)?.addEventListener("change", async (e) => {
    if ((e.target as HTMLInputElement).files.length > 0) {
      const txt = await (e.target as HTMLInputElement).files[0].text();
      try {
        const yaml = load(txt);
        const groups = (yaml as InfoTree).groups;
        let md = 0;
        for (let k in groups) {
          md = Math.max(calcDepth(groups, k, 0), md);
        }
        document.querySelector("#groups").innerHTML = "";
        for (let i = 0; i <= md; i++) {
          let tmpDiv = document.createElement("div");
          tmpDiv.id = `depth-${i}`;
          tmpDiv.classList.add("group-column");
          document.querySelector("#groups").appendChild(tmpDiv);
        }
      } catch (e) {
        alert(e);
      }
    }
    (document.querySelector("#upload_file") as HTMLInputElement).value = "";
  });

  document.querySelector("#upload_btn")?.addEventListener("click", () => {
    (document.querySelector("#upload_file") as HTMLInputElement)?.click();
  });
});

jsPlumbBrowserUI.ready(() => {
  const container = document.querySelector("#container");

  instance = jsPlumbBrowserUI.newInstance({
    container: container,
    connectionsDetachable: false,
    dragOptions: { containment: ContainmentType.parentEnclosed },
  });

  instance.manage(container);

  /*
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
    overlays: [
      { type: "Arrow", options: { location: 1 } },
      { type: "Label", options: { label: "Test", cssClass: "mt-5" } },
    ],
  });
  */
});
