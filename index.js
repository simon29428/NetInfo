jsPlumbBrowserUI.ready(() => {
  instance = jsPlumbBrowserUI.newInstance({
    container: container,
    connectionsDetachable: false,
    dragOptions: {
      containment: "parentEnclosed",
    },
  });

  instance.manage(container);

  c1 = instance.connect({
    source: ep1,
    target: ep2,
    endpointStyle: "Blank",
    anchors: ["AutoDefault", "AutoDefault"],
    connector: {
      type: "Straight",
      options: { stub: 30 },
    },
    overlays: [{ type: "Arrow", options: { location: 1 } }],
  });

  instance.connect({
    source: ep1,
    target: ep3,
    endpointStyle: "Blank",
    anchors: ["AutoDefault", "AutoDefault"],
    connector: {
      type: "Straight",
      options: { stub: 30 },
    },
    overlays: [{ type: "Arrow", options: { location: 1 } }],
  });

  instance.connect({
    source: ep1,
    target: ep4,
    endpointStyle: "Blank",
    anchors: ["AutoDefault", "AutoDefault"],
    connector: {
      type: "Straight",
      options: { stub: 30 },
    },
    overlays: [{ type: "Arrow", options: { location: 1 } }],
  });
});
