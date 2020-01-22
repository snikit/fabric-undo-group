import { Component, OnInit, AfterViewInit } from "@angular/core";
import * as fromFabric from "fabric";
import { TEST_PLAN, TEST_SVG } from "./plan";
import { UndoService } from "./undo/undo.service";

const IMAGE_SMOOTHING = true;
const CACHING = true;

fromFabric.fabric.Object.prototype.noScaleCache = false;

@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent implements OnInit, AfterViewInit {
  caching = CACHING;
  imageSmoothing = IMAGE_SMOOTHING;
  shadow = null;
  // &&
  // new fromFabric.fabric.Shadow({
  //   color: "#B7BABC",
  //   blur: 4,
  //   offsetX: 2,
  //   offsetY: 2,
  //   affectStroke: true,
  //   includeDefaultValues: true,
  //   nonScaling: true
  // });

  canvas: fromFabric.fabric.Canvas;
  stacking = true;
  baseSvgPath = TEST_SVG; //"/assets/sofa.svg";
  dims = {
    height: 800,
    width: 400
  };

  dcanvas: HTMLCanvasElement;

  constructor(private undoservice: UndoService) {}

  ngOnInit() {
    this.init();
  }

  ngAfterViewInit() {
    this.dcanvas = document.querySelector("#d");
  }

  undo = [];

  undoaction(){


    const action = this.undo.pop()

    console.log(action)

  const selection : fromFabric.fabric.ActiveSelection = action.selection;
  

  selection.setOptions(JSON.parse(action.state));

     selection.setCoords();

this.canvas.renderAll()

  }

  activateListener() {
    this.canvas.on({
      "mouse:down": e => {
        console.log(e.target);
        // console.error(e.target.saveState()); // same same
        // fromFabric.fabric.Object.prototype.objectCaching = true;
      },
      "mouse:up": e => {
        // fromFabric.fabric.Object.prototype.objectCaching = false;
      },
      'selection:updated' : e=>{
        console.error('selection:updated')
        console.log(e)


        this.undo.push( {
          selection : e.target ,
          state :  JSON.stringify(e.target.saveState())
        })
      },
      "object:modified": e => {
        console.error('object:modified')
          console.log(e)
        const action = e.transform["action"];

        switch (action) {
          case "scale":
            // this.undo.push({
            //   selection: e.target,
            //   x : e.transform['newScaleX'],
            //   y : e.transform['newScaleY']

            // });

            break;
        }

              console.log(this.undo);
      }
    });

    this.canvas.on("mouse:wheel", opt => {
      const me = <MouseEvent>opt.e;

      //@ts-ignore
      const delta = me.deltaY;
      let zoom = this.canvas.getZoom();
      zoom = zoom + delta / 200;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      //@ts-ignore
      this.canvas.zoomToPoint({ x: me.offsetX, y: me.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  clear2() {
    const destCtx = this.dcanvas.getContext("2d");
    destCtx.clearRect(0, 0, this.dcanvas.width, this.dcanvas.height);
  }

  random() {
    //@ts-ignore
    const canvas = this.canvas.toCanvasElement();
    const destCtx = this.dcanvas.getContext("2d");
    destCtx.drawImage(canvas, 0, 0);
  }

  init() {
    // fromFabric.fabric.Object.prototype.objectCaching = false;

    let { height, width } = this.dims;

    this.canvas = new fromFabric.fabric.Canvas("c", {
      imageSmoothingEnabled: this.imageSmoothing,
      enableRetinaScaling: true,
      preserveObjectStacking: this.stacking,
      backgroundColor: "transparent",
      perPixelTargetFind: false
    });

    this.canvas.setHeight(height);
    this.canvas.setWidth(width);
    this.activateListener();
  }

  clearcanvas() {
    this.canvas.clear().renderAll();
    this.canvas.backgroundColor = "transparent";
  }

  i = 0;

  randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min; //50 * this.i;
  }

  addCustom(customSVG: string) {
    this.fetchUsingFabric(customSVG).then(
      asset => {
        const pt = this.randomPoint();

        asset.set({
          left: pt.x,
          top: pt.y
        });

        asset.setShadow(this.shadow);
        this.setCaching(asset);
        this.canvas.add(asset);
      },
      rej => {}
    );
  }

  setCaching(asset: fromFabric.fabric.Object) {
    if (this.caching) {
      return;
    }

    asset.objectCaching = this.caching;

    //@ts-ignore
    asset["getObjects"] &&
      asset["getObjects"].forEach(obj => {
        obj.objectCaching = this.caching;
      });
  }

  randomPoint() {
    const x = this.randomInt(0, this.dims.width);
    const y = this.randomInt(0, this.dims.height);

    return new fromFabric.fabric.Point(x, y);
  }

  addSvg(load: number) {
    let loading = load;
    this.i++; // batches of 100 at 100 * batch no for location

    this.canvas.renderOnAddRemove = false;
    for (let i = 0; i < load; i++) {
      this.fetchUsingFabric(this.baseSvgPath).then(
        asset => {
          const pt = this.randomPoint();

          asset.set({
            left: pt.x,
            top: pt.y
          });
          this.setCaching(asset);
          asset.setShadow(this.shadow);

          this.canvas.add(asset);
          --loading;
        },
        rej => {
          --loading;
        }
      );
    }
    this.canvas.renderOnAddRemove = true;
  }

  fetchUsingFabric(path: string): Promise<any> {
    return new Promise((res, rej) => {
      fromFabric.fabric.loadSVGFromString(path, (objects, options) => {
        if (!objects) {
          rej("empty svg !");
        } else {
          res(fromFabric.fabric.util.groupSVGElements(objects, options));
        }
      });
    });
  }

  loadPlan() {
    this.canvas.loadFromJSON(TEST_PLAN, () => {
      this.canvas.requestRenderAll();
    });

    this.translate();
  }

  translate() {
    this.canvas.viewportTransform[4] =
      this.canvas.viewportTransform[4] + 1000 / 2;
    this.canvas.viewportTransform[5] =
      this.canvas.viewportTransform[5] + 800 / 2;
  }
}
