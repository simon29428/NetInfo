export class NodeGroup extends HTMLElement {
  private nodeGroupItems: Array<NodeGroupItem>;
  private templateContent;
  constructor() {
    super();
    const template = document.querySelector("#node-group-template") as HTMLTemplateElement;
    this.templateContent = template.content;
    this.innerHTML = "";
    this.appendChild(this.templateContent.cloneNode(true));
  }

  public set items(v: Array<NodeGroupItem>) {
    this.nodeGroupItems = v;
    this.templateContent.querySelector(".node-group-content").innerHTML = "";
    this.nodeGroupItems?.forEach((v) => {
      this.templateContent.querySelector(".node-group-content").appendChild(v);
    });
  }
}

export class NodeGroupItem extends HTMLElement {
  constructor() {
    super();
    const template = document.querySelector("#node-group-item-template") as HTMLTemplateElement;
    const templateContent = template.content;
    templateContent.querySelector(".node-group-item-content").innerHTML = this.innerHTML;
    this.innerHTML = "";
    this.appendChild(templateContent.cloneNode(true));
  }
}

export class MdiIcon extends HTMLElement {
  private iconVal: string = "";

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["icon"];
  }

  public set icon(v: string) {
    this.attributeChangedCallback("icon", this.iconVal, v);
    this.iconVal = v;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "icon") {
      if (newValue !== "" && newValue.startsWith("M")) {
        this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="24" height="24">
        <g><path fill="#000000" d="${newValue}"/></g>
        </svg>`;
      } else {
        this.innerHTML = "";
      }
    }
  }
}
