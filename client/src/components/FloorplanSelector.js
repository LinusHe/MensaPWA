import React from 'react'
import { useParams } from 'react-router-dom';
import * as d3 from 'd3'
import $ from 'jquery'
import floorPlanImage from '../assets/mensaplan.svg'
import '../assets/floorplan.css'
import { useNavigate } from 'react-router-dom';

// FloorplanSelector component
function FloorplanSelector() {
  let { code } = useParams();
  const navigate = useNavigate();

  // Constants for zooming
  const minZoom = 0.8;
  const maxZoom = 10;
  const bounds = 200;
  const initialScaleFactor = 2.1;

  // Array to hold table elements
  let tables = [];

  // Function to handle zooming
  function zoomed(event, image) {
    const { transform } = event;
    image.attr("transform", transform.toString());
  }

  // Function to initiate zooming
  function initiateZoom(zoom, mapHolderWidth, mapHolderHeight, svg, zoomDirection) {
    zoom
      .scaleExtent([minZoom, maxZoom])
      .translateExtent([[-bounds / 2, -bounds / 2], [mapHolderWidth + bounds / 2, mapHolderHeight + bounds / 2]]);

    const initialScale = minZoom * initialScaleFactor;
    const startScale = initialScale / 2;
    let initialCenterX = (mapHolderWidth - initialScale * mapHolderWidth) / 2;
    switch (zoomDirection) {
      case 'N':
        initialCenterX = 0;
        break;
      case 'S':
        initialCenterX = (mapHolderWidth - initialScale * mapHolderWidth)
        break;
      default:
        break;
    }
    const initialCenterY = (mapHolderHeight - initialScale * mapHolderHeight) / 2 - 130;
    const startCenterX = (mapHolderWidth - startScale * mapHolderWidth) / 2;
    const startCenterY = (mapHolderHeight - startScale * mapHolderHeight) / 2 - 130;

    svg
      .call(zoom.transform, d3.zoomIdentity.translate(startCenterX, startCenterY).scale(startScale))
      .transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity.translate(initialCenterX, initialCenterY).scale(initialScale));
  }

  // Function to handle table click
  function handleTableClick(table, pinIcon, zoom, mapHolderWidth, mapHolderHeight, svg) {
    const locationCode = getLocationCode(table.id);
    console.log(locationCode);
    d3.selectAll(".table").classed("table-on", false);
    d3.select(table).classed("table-on", true);

    console.log(table)

    pinTable(table, pinIcon);

    let zoomDirection = getLocationCode(table.id).charAt(0).toUpperCase();
    zoomToTable(zoom, svg, zoomDirection, mapHolderWidth, mapHolderHeight,);
    navigate(`/${locationCode}`);
  }

  // Function to zoom to a specific table
  function zoomToTable(zoom, svg, zoomDirection, mapHolderWidth, mapHolderHeight) {
    const currentTransform = d3.zoomTransform(svg.node());
    const currentScale = currentTransform.k;
    const currentCenterX = currentTransform.x;
    const currentCenterY = currentTransform.y;
    console.log("Current Zoom: " + currentScale);

    const newScale = currentScale * 1.2 < 2.1 ? currentScale * 1.2 : currentScale;
    const newCenterY = (mapHolderHeight - newScale * mapHolderHeight) / 2 - 130;
    let newCenterX = (mapHolderWidth - currentScale * mapHolderWidth) / 2;
    switch (zoomDirection) {
      case 'N':
        newCenterX = 0;
        break;
      case 'S':
        newCenterX = (mapHolderWidth - newScale * mapHolderWidth);
        break;
      default:
        break;
    }

    svg
      .transition()
      .duration(1000)
      .call(zoom.transform, d3.zoomIdentity.translate(newCenterX, newCenterY).scale(newScale));


  }

  // Function to pin a table
  function pinTable(table, pinIcon) {
    const centroid = getCentroid(table);
    const centerX = centroid[0] - pinIcon.node().getBBox().width / 2;
    const centerY = centroid[1] - pinIcon.node().getBBox().height;

    pinIcon
      .attr("transform", `translate(${centerX - 0},${centerY - 10})`)
      .attr("opacity", 0)
      .transition()
      .duration(500)
      .attr("transform", `translate(${centerX},${centerY})`)
      .attr("opacity", 1);
  }

  // Function to get location code from table id
  function getLocationCode(id) {
    const segments = id.split("_");
    if (segments.length >= 2) {
      let locationCode = segments[1];
      locationCode = locationCode.replace(/R/g, "S");
      locationCode = locationCode.replace(/L/g, "N");
      return locationCode;
    } else {
      return "";
    }
  }

  // Function to get centroid of a table
  function getCentroid(table) {
    const rect = table.getBBox();
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    return [cx, cy];
  }


  // Use effect hook to handle component mount
  React.useEffect(() => {
    let image;

    const mapHolderWidth = $("#map-holder").width();
    const mapHolderHeight = $("#map-holder").height();

    const zoom = d3.zoom().on("zoom", (event) => zoomed(event, image));

    const svgContainer = d3.select("#map-holder");

    let zoomDirection = 'M';

    // Check if svg element is already present
    if (svgContainer.select("svg").empty()) {

      const svg = d3
        .select("#map-holder")
        .append("svg")
        .attr("id", "image")
        .attr("width", mapHolderWidth)
        .attr("height", mapHolderHeight)
        .call(zoom);

      d3.xml(floorPlanImage).then(function (xml) {
        const importedNode = document.importNode(xml.documentElement, true);

        image = svg.append("g").attr("id", "map");
        image.node().appendChild(importedNode);

        const pinIcon = d3.select("#pin").attr("opacity", 0);
        tables = Array.from(image.selectAll("g > *[id*='Table']").nodes());

        tables.forEach(function (table) {
          d3.select(table)
            .classed("table", true)
            .on("click", function (d) {
              handleTableClick(table, pinIcon, zoom, mapHolderWidth, mapHolderHeight, svg);
            });
        });

        // Check if code prop is provided and matches any table id
        if (code) {
          const table = tables.find(t => getLocationCode(t.id) === code);
          if (table) {
            zoomDirection = getLocationCode(table.id).charAt(0).toUpperCase();
            setTimeout(() => handleTableClick(table, pinIcon, zoom, mapHolderWidth, mapHolderHeight, svg), 1000);
          }
        }

        initiateZoom(zoom, mapHolderWidth, mapHolderHeight, svg, zoomDirection);


      });
    }
  }, [code]);

  // Render the component
  return (
    <div id="map-holder"></div>
  )
}

export default FloorplanSelector