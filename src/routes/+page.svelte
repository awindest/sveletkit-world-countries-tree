<script>
  import { onMount } from 'svelte'
  import * as d3 from 'd3'
  export let data
  let root
  let dx, dy
// const width = document.documentElement.scrollWidth
// const height = document.body.clientHeight;
// const height = document.documentElement.scrollHeight
const margin = { top: 10, right: 10, bottom: 10, left: 40};
// const innerWidth = width - margin.left - margin.right;
// const innerHeight = height - margin.top - margin.bottom;
  // Specify the charts’ dimensions. The height is variable, depending on the layout.
  let width
  let height

  let svg
  let tree
  const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x)

  let zoomG
  let gLink
  let gNode


  onMount(async () => { // DOM loaded? Yes!

    width = document.body.clientWidth
    height = document.body.clientHeight
    drawChart()

  // Do the first update to the initial configuration of the tree

    root.x0 = dy / 2;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      // if (d.depth === 2) d.children = null;
    })
    update(null, root)
 
  })
// https://github.com/lipis/flag-icons
// nice job on the flag svgs, y'all!

function getDimensions(selection) {
      let dimensions = null
      let node = selection.node()
  
      if (node instanceof SVGElement) {
        dimensions = node.getBBox()
        console.log('getting BBox')
      } else {
        dimensions = node.getBoundingClientRect()
      }
      console.log('in compute', dimensions.height, dimensions.width)
      return dimensions
    }

function drawChart() {

    // Compute the tree height; this approach will allow the height of the
    // SVG to scale according to the breadth (width) of the tree layout.
    root = d3.hierarchy(data)
    root.sort((a, b) => d3.ascending(a.data.id, b.data.id))

  // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
  // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
  // “bottom”, in the data domain. The width of a column is based on the tree’s height.

  dx = 30; // change this parameter for spacing between nodes
  dy = (width - margin.right - margin.left) / (1 + root.height)

  // Define the tree layout and the shape for links.
  tree = d3.tree().nodeSize([dx, dy]);
  // tree = d3.tree().size([height, width]);

  // Create the SVG container, a layer for the links and a layer for the nodes.
  svg = d3.select("#graph").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-margin.left, -margin.top, width, dx])
      .attr("style", "max-width: 100%; height: auto; font: 14px sans-serif; user-select: none;");
  
  // to zoom or not to zoom
  const handleZoom = (e) => { zoomG.attr('transform', e.transform) }
        
  const zoom = d3.zoom().on('zoom', handleZoom);
  zoomG = svg
        .attr("width", width)
        .attr("height", height)
      .append('g')
  d3.select('svg').call(zoom)

  // node and link section

  gLink = zoomG.append("g")
      .attr("fill", "none")
      .attr("stroke", "#a00be6")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 3);

  gNode = zoomG.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

    // Compute the extent of the tree. Note that x and y are swapped here
    // because in the tree layout, x is the breadth, but when displayed, the
    // tree extends right rather than down.
    // let x0 = Infinity
    // let x1 = -x0
    // let ncountries = 0
    // root.each(d => {
    //   if (d.x > x1) x1 = d.x;
    //   if (d.x < x0) x0 = d.x;
    //   ncountries += 1
    // })
    // // Compute the adjusted height of the tree.
    // const height = x1 - x0 + dx * 2;
   
  }

    
  function update(event, source) {
    const duration = event?.altKey ? 2500 : 2500; // hold the alt key to slow down the transition
    const nodes = root.descendants().reverse()
    const links = root.links()

    // Compute the new tree layout.
    tree(root)

    let left = root;
    let right = root;
    root.eachBefore(node => {
      if (node.x < left.x) left = node;
      if (node.x > right.x) right = node;
    });

    const height = right.x - left.x + margin.top + margin.bottom;

    const transition = svg.transition()
        .duration(duration)
        .attr("height", height)
        .attr("viewBox", [-margin.left-10, left.x - margin.top, width, height])
        .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

    // Update the nodes…
    const node = gNode.selectAll("g")
      .data(nodes, d => d.id)
      .attr('id', d => { console.log(d.id) } )


    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node.enter().append("g")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (event, d) => {
          d.children = d.children ? null : d._children;
          update(event, d);
        });

    nodeEnter.append("circle")
        .attr("r", 4)
        .attr("fill", d => d._children ? "#555" : "#999")
        .attr("stroke-width", 10)


    nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.children ? -6 : '3.5em')
        .attr("text-anchor", d => d._children ? "end" : "start")
        .text(d => d.data.data.id)
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("stroke", "white")
        .attr("paint-order", "stroke")


    nodeEnter.append("image")
        .attr('href', d => d.children ? '' :  d.data.data.image)
        .attr('x', '8px') 
        .attr("y", '-12px')
        .attr('width',  '32px') // icons are 4x3
        .attr('height', '24px')

    nodeEnter.append("rect")
        .attr('x', '8px') 
        .attr("y", '-12px')
        .attr('width',  '32px') // used to be 16px
        .attr('height', '24px')
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', '1px')
        .attr('opacity', d => d._children ? '0' :  '1')

    // Transition nodes to their new position.
    const nodeUpdate = node.merge(nodeEnter).transition(transition)
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    const nodeExit = node.exit().transition(transition).remove()
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

    // Update the links…
    const link = gLink.selectAll("path")
      .data(links, d => d.target.id);

    // Enter any new links at the parent's previous position.
    const linkEnter = link.enter().append("path")
        .attr("d", d => {
          const o = {x: source.x0, y: source.y0};
          return diagonal({source: o, target: o});
        });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition(transition).remove()
        .attr("d", d => {
          const o = {x: source.x, y: source.y};
          return diagonal({source: o, target: o});
        });

    // Stash the old positions for transition.
    root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

  }
  // this function moves to the component and centers it on the page.
  function goToComponent(theComponent) {
      if(theComponent) {
        const element = document.getElementById(theComponent)
        element.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "center"
              })
            }
  }

</script>

<div id="graph"></div>
