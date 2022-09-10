export class NodeGroup extends HTMLElement {
  private nodeGroupItems: Array<NodeGroupItem>;
  private templateContent: DocumentFragment;

  constructor() {
    super();
    const template = document.querySelector("#node-group-template") as HTMLTemplateElement;
    this.templateContent = template.content;
    setTimeout(() => {
      const rawHtml = this.innerHTML;
      this.innerHTML = "";
      this.appendChild(this.templateContent.cloneNode(true));
      this.querySelector(".node-group-content").innerHTML = rawHtml;
    });
  }
  static get observedAttributes() {
    return ["title"];
  }
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    setTimeout(() => {
      if (name === "title") {
        if (newValue !== "") {
          console.log(this);
          this.querySelector(".node-group-title").innerHTML = newValue;
        } else {
          this.querySelector(".node-group-title").innerHTML = "";
        }
      }
    });
  }

  public set items(v: Array<NodeGroupItem>) {
    this.nodeGroupItems = v;
    this.querySelector(".node-group-content").innerHTML = "";
    this.nodeGroupItems?.forEach((v) => {
      this.querySelector(".node-group-content").appendChild(v);
    });
  }
}

export class NodeGroupItem extends HTMLElement {
  constructor() {
    super();
    setTimeout(() => {
      const template = document.querySelector("#node-group-item-template") as HTMLTemplateElement;
      const templateContent = template.content;
      templateContent.querySelector(".node-group-item-content").innerHTML = this.innerHTML;
      this.innerHTML = "";
      this.appendChild(templateContent.cloneNode(true));
    });
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
