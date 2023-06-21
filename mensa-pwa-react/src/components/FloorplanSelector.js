import React from 'react'
import * as d3 from 'd3'
import $ from 'jquery'
import mensaplan from '../assets/mensaplan.svg'
import '../assets/floorplan.css'

function FloorplanSelector() {
  React.useEffect(() => {
    const minZoom = 0.8;
    const maxZoom = 10;
    const bounds = 200;
    const initialScaleFactor = 2.5;

    let image;
    let tables = [];
    const mapHolderWidth = $("#map-holder").width();
    const mapHolderHeight = $("#map-holder").height();

    function zoomed(event) {
      const { transform } = event;
      image.attr("transform", transform.toString());
    }

    const zoom = d3.zoom().on("zoom", zoomed);

    function initiateZoom() {
      zoom
        .scaleExtent([minZoom, maxZoom])
        .translateExtent([[-bounds / 2, -bounds / 2], [mapHolderWidth + bounds / 2, mapHolderHeight + bounds / 2]]);

      const initialScale = minZoom * initialScaleFactor;
      const startScale = initialScale / 2;
      const initialCenterX = (mapHolderWidth - initialScale * mapHolderWidth) / 2;
      const initialCenterY = (mapHolderHeight - initialScale * mapHolderHeight) / 2 -130;
      const startCenterX = (mapHolderWidth - startScale * mapHolderWidth) / 2;
      const startCenterY = (mapHolderHeight - startScale * mapHolderHeight) / 2 -130;

      svg
        .call(zoom.transform, d3.zoomIdentity.translate(startCenterX, startCenterY).scale(startScale))
        .transition()
        .duration(1000)
        .call(zoom.transform, d3.zoomIdentity.translate(initialCenterX, initialCenterY).scale(initialScale));
    }

    const svg = d3
      .select("#map-holder")
      .append("svg")
      .attr("id", "image")
      .attr("width", mapHolderWidth)
      .attr("height", mapHolderHeight)
      .call(zoom);

    function handleTableClick(table, pinIcon) {
      alert(getLocationCode(table.id));
      d3.selectAll(".table").classed("table-on", false);
      d3.select(table).classed("table-on", true);

      pinTable(table, pinIcon);
    }

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

    function getCentroid(table) {
      const rect = table.getBBox();
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      return [cx, cy];
    }

    d3.xml(mensaplan).then(function (xml) {
      const importedNode = document.importNode(xml.documentElement, true);

      image = svg.append("g").attr("id", "map");
      image.node().appendChild(importedNode);

      const pinIcon = d3.select("#pin").attr("opacity", 0);
      tables = Array.from(image.selectAll("g > *[id*='Table']").nodes());

      tables.forEach(function (table) {
        d3.select(table)
          .classed("table", true)
          .on("click", function (d) {
            handleTableClick(table, pinIcon);
          });
      });

      initiateZoom();
    });
  }, []);

  return (
    <div id="map-holder"></div>
  )
}

export default FloorplanSelector