document.addEventListener("DOMContentLoaded", function () {
  // selection de dom html
  const start = document.getElementById("start");
  const end = document.getElementById("end");
  const saveData = document.getElementById("save-data");
  const minimisation = document.getElementById("minimisation");
  const maximisation = document.getElementById("maximisation");
  let graphMax = [];
  let graphMin = [];

  const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [
      {
        selector: "node",
        style: {
          "background-color": "#166534",
          "text-valign": "center",
          "text-halign": "center",
          label: "data(label)",
          color: "#fff",
          "font-size": "24px",
          "text-outline-width": 2,
          "text-outline-color": "#166534",
          width: 50,
          height: 50,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1, // lignes très fines
          "line-color": "#166534",
          "target-arrow-color": "#166534",
          "target-arrow-shape": "triangle",
          label: "data(label)",
          "font-size": "16px",
          color: "#166534",
          "text-background-opacity": 1,
          "text-background-color": "#ffffff",
          "text-background-padding": "3px",
          "text-rotation": "autorotate",
          "curve-style": "bezier",
        },
      },
    ],
    layout: {
      name: "grid",
    },

    userZoomingEnabled: false,
  });

  let nodeId = 0;
  let edgeId = 0;
  let isAddingEdge = false;
  let sourceNode = null;

  cy.on("tap", function (event) {
    if (event.target === cy) {
      // Add a new node
      let nodeName = prompt("NOM DU SOMMET : ");
      if (nodeName !== null) {
        const position = event.position;
        const newNode = cy.add({
          group: "nodes",
          data: { id: `n${nodeId++}`, label: nodeName.toUpperCase() },
          position: { x: position.x, y: position.y },
        });
      }
    } else if (event.target.isNode()) {
      if (isAddingEdge) {
        // Add an edge from sourceNode to the clicked node
        const newWeight = parseInt(prompt("ENTRER LA DISTANCE : "));
        cy.add({
          group: "edges",
          data: {
            id: `e${edgeId++}`,
            source: sourceNode.id(),
            target: event.target.id(),
            label: newWeight,
          },
        });
        isAddingEdge = false;
        sourceNode = null;
      } else {
        // Set the clicked node as the source for a new edge
        sourceNode = event.target;
        isAddingEdge = true;
      }
    }
  });

  // Add double-click event on edges to remove them
  cy.on("cxttap", "edge", (event) => {
    console.log(event);
    event.target.remove();
  });

  cy.on("cxttap", "node", (event) => {
    event.target.remove();
  });
  // Add double-click event on edges to change their label
  cy.on("dblclick", "edge", function (event) {
    const edge = event.target;
    console.log(edge.data("label"));
    const newLabel = prompt(
      "Enter new label for the edge:",
      edge.data("label")
    );
    if (newLabel !== null) {
      edge.data("label", newLabel);
      console.log(edge.data("label"));
    }
  });

  // Add Interact.js for draggable nodes
  interact("#cy").on("tap", (event) => {
    const node = cy.$(`node[id="${event.target.id}"]`);
    if (node) {
      node.position({
        x: event.clientX,
        y: event.clientY,
      });
    }
  });

  cy.on("tap", function (event) {
    const target = event.target;

    // Vérifie si la touche Ctrl est enfoncée
    if (event.originalEvent.ctrlKey) {
      // Actions à effectuer lors d'un Ctrl + clic gauche
      console.log("Ctrl + clic gauche sur :", target.id());
    }
  });

  saveData.addEventListener("click", function () {
    const nodes = cy.nodes().map((node) => ({
      id: node.id(),
      label: node.data("label"),
      position: node.position(),
    }));

    const edges = cy.edges().map((edge) => ({
      id: edge.id(),
      source: edge.data("source"),
      target: edge.data("target"),
      label: edge.data("label"),
    }));

    let allNodes = [];
    let allNodesMax = [];
    let startOption = "";
    let endOption = "";

    const graphData = { nodes, edges };
    console.log(graphData);

    for (let node of nodes) {
      allNodes.push({
        id: node.id,
        summit: node.label,
        value: 0,
        marked: false,
        next: [],
        prev: null,
      });
      allNodesMax.push({
        id: node.id,
        summit: node.label,
        value: -Infinity,
        marked: false,
        next: [],
        prev: null,
      });
      startOption += `
        <option value=${node.label}>${node.label}</option>
      `;
      endOption += `
        <option value=${node.label}>${node.label}</option>
      `;
    }
    let n = allNodes;

    console.log("node min", allNodes);
    console.log("node n", n);

    for (let n of allNodes) {
      for (let e of edges) {
        if (e.source === n.id) {
          n.next.push({
            summit: getNodeById(nodes, e.target),
            weight: e.label,
          });
        }
      }
    }

    for (let n of allNodesMax) {
      for (let e of edges) {
        if (e.source === n.id) {
          n.next.push({
            summit: getNodeById(nodes, e.target),
            weight: e.label,
          });
        }
      }
    }

    start.innerHTML = startOption;
    end.innerHTML = endOption;

    graphMin = allNodes;
    graphMax = allNodesMax;
  });

  // recherche de chemin plus court
  minimisation.addEventListener("click", function () {
    const containerMax = document.getElementById("steps-element-max");
    const containerMin = document.getElementById("steps-element-min");
    if (!areAllMarked(graphMin)) {
      while (containerMin.hasChildNodes()) {
        containerMin.removeChild(containerMin.firstChild);
      }
    }

    if (containerMax.children.length > 0) {
      containerMax.style.display = "none";
      document.getElementById("steps-element-min").style.display = "block";
    }

    const inputStart = start.value;
    const inputEnd = end.value;

    const result = dantzigMin(graphMin, inputStart, inputEnd);
    highlightShortestPath(result.path, cy);

    console.log("resultat", result);
  });

  maximisation.addEventListener("click", function () {
    const containerMax = document.getElementById("steps-element-max");
    const containerMin = document.getElementById("steps-element-min");
    if (!areAllMarked(graphMax)) {
      while (containerMax.hasChildNodes()) {
        containerMax.removeChild(containerMax.firstChild);
      }
    }

    if (containerMin.children.length > 0) {
      containerMin.style.display = "none";
      containerMax.style.display = "block";
    }

    const inputStart = start.value;
    const inputEnd = end.value;
    console.log(inputStart, inputEnd);

    const result = dantzigMax(graphMax, inputStart, inputEnd);
    highlightShortestPath(result.path, cy);

    console.log("resultat", result);
  });
});

function highlightShortestPath(shortestPath, cy) {
  // Reset all styles
  cy.nodes().style("background-color", "#166534");
  cy.edges().style("line-color", "#166534");
  cy.edges().style("target-arrow-color", "#166534");

  // Highlight nodes in the shortest path
  shortestPath.forEach((nodeLabel, index) => {
    const node = cy.nodes().filter(`[label = "${nodeLabel}"]`);
    node.style("background-color", "#0ea5e9");
  });

  // Highlight edges in the shortest path
  for (let i = 0; i < shortestPath.length - 1; i++) {
    const sourceNode = cy.nodes().filter(`[label = "${shortestPath[i]}"]`).id();
    const targetNode = cy
      .nodes()
      .filter(`[label = "${shortestPath[i + 1]}"]`)
      .id();
    const edge = cy
      .edges()
      .filter(`[source = "${sourceNode}"][target = "${targetNode}"]`);
    edge.style("line-color", "red");
    edge.style("target-arrow-color", "red");
  }
}

function getNodeById(nodes, id) {
  let n = null;
  for (let node of nodes) {
    if (node.id == id) n = node.label;
  }

  return n;
}

const dantzigMin = (graph, start, end) => {
  // etape 1 marque le premier de graphe
  graph.forEach((node) => {
    if (node.summit == start) {
      node.marked = true;
    }
  });

  let nodesNotMarked = graph.filter((node) => !node.marked);
  let nodesMarked = graph.filter((node) => node.marked);
  let tempVal = [];
  let i = 1;

  document.getElementById(
    "begin"
  ).innerHTML = `ᴧ<sub>${start}</sub></span> = 0 | E<sub>${i}</sub> = {${start}}`;
  while (!areAllMarked(graph)) {
    nodesMarked.forEach((node) => {
      let min = Infinity;
      let summit = "";
      node.next.forEach((nextNode) => {
        let neighbor = graph.find((node) => node.summit === nextNode.summit);
        if (nextNode.weight <= min && !neighbor.marked) {
          min = nextNode.weight;
          summit = nextNode.summit;
        }
      });
      nodesNotMarked.forEach((elem) => {
        if (elem.summit === summit) {
          elem.value = min + node.value;
          tempVal.push({
            start: node.summit,
            end: elem.summit,
            value: elem.value,
            startValue: node.value,
          });
        }
      });
    });
    const container = document.createElement("div");
    const k = document.createElement("h4");
    k.style.fontWeight = "bold";
    k.style.fontSize = "28px";
    k.style.color = "#3f6212";
    k.style.textDecoration = "underline";
    k.innerHTML = `K = ${i}`;

    container.appendChild(k);
    tempVal.forEach((elem) => {
      let lambda = document.createElement("h4");
      let spanLambda = document.createElement("span");

      let min = selectMin(tempVal);
      if (min.start == elem.start && min.end == elem.end) {
        lambda.innerHTML = `V(${elem.start}, ${elem.end}) <span class="text-2xl">ᴧ<sub>${elem.end}</sub></span> = ${elem.startValue} + V(${elem.start}, ${elem.end}) = ${elem.value}`;
        lambda.style.color = "#166534";
      } else {
        lambda.innerHTML = `V(${elem.start}, ${elem.end}) <span class="text-2xl">ᴧ<sub>${elem.end}</sub></span> = ${elem.startValue} + V(${elem.start}, ${elem.end}) = ${elem.value}`;
        lambda.style.color = "black";
      }
      container.appendChild(lambda);
    });

    let minVal = selectMin(tempVal);
    graph.forEach((n) => {
      if (n.summit == minVal.end) {
        n.marked = true;
        n.value = minVal.value;
        n.prev = graph.filter((node) => node.summit === minVal.start)[0];
      }
    });

    nodesNotMarked = graph.filter((node) => !node.marked);
    nodesMarked = graph.filter((node) => node.marked);

    let marked = nodesMarked.map((elem) => elem.summit);
    console.log(marked);
    container.classList.add("border");
    container.classList.add("w-full");
    container.classList.add("border-gray-800");
    container.classList.add("my-2");

    tempVal = [];
    document.getElementById("steps-element-min").appendChild(container);
    i++;
  }

  // Reconstruct the shortest path
  const shortestPath = [];
  let currentNode = graph.find((node) => node.summit === end);

  while (currentNode) {
    shortestPath.unshift(currentNode.summit);
    currentNode = currentNode.prev;
  }

  return { graph, path: shortestPath };
};

const dantzigMax = (graph, start, end) => {
  // etape 1 marque le premier de graphe
  graph.forEach((node) => {
    if (node.summit == start) {
      node.value = 0;
      node.marked = true;
    }
  });

  let nodesNotMarked = graph.filter((node) => !node.marked);
  let nodesMarked = graph.filter((node) => node.marked);
  let tempVal = [];
  let marked = [];
  let i = 1;

  document.getElementById(
    "begin"
  ).innerHTML = `ᴧ<sub>${start}</sub></span> = 0 | E<sub>${i}</sub> = {${start}}`;

  document.getElementById(
    "begin"
  ).innerHTML = `ᴧ<sub>${start}</sub></span> = 0 | E<sub>${i}</sub> = {${start}}`;

  while (!areAllMarked(graph)) {
    console.log("marked : ", nodesMarked);
    nodesMarked.forEach((node) => {
      let max = -Infinity;
      let summit = "";
      node.next.forEach((nextNode) => {
        let neighbor = graph.find((node) => node.summit === nextNode.summit);
        if (nextNode.weight >= max && !neighbor.marked) {
          max = nextNode.weight;
          summit = nextNode.summit;
        }
      });
      nodesNotMarked.forEach((elem) => {
        if (elem.summit === summit) {
          elem.value = max + node.value;
          tempVal.push({
            start: node.summit,
            end: elem.summit,
            value: elem.value,
            startValue: node.value,
          });
        }
      });
    });
    const container = document.createElement("div");
    const k = document.createElement("h4");
    k.style.fontWeight = "bold";
    k.style.fontSize = "28px";
    k.style.color = "#3f6212";
    k.style.textDecoration = "underline";
    k.innerHTML = `K = ${i}`;

    container.appendChild(k);
    tempVal.forEach((elem) => {
      let lambda = document.createElement("h4");

      let min = selectMax(tempVal);
      if (min.start == elem.start && min.end == elem.end) {
        lambda.innerHTML = `V(${elem.start}, ${elem.end}) <span class="text-2xl">ᴧ<sub>${elem.end}</sub></span> = ${elem.startValue} + V(${elem.start}, ${elem.end}) = ${elem.value}`;
        lambda.style.color = "#166534";
      } else {
        lambda.innerHTML = `V(${elem.start}, ${elem.end}) <span class="text-2xl">ᴧ<sub>${elem.end}</sub></span> = ${elem.startValue} + V(${elem.start}, ${elem.end}) = ${elem.value}`;
        lambda.style.color = "black";
      }
      container.appendChild(lambda);
    });

    let maxVal = selectMax(tempVal);
    graph.forEach((n) => {
      if (n.summit == maxVal.end) {
        n.marked = true;
        n.value = maxVal.value;
        n.prev = graph.filter((node) => node.summit === maxVal.start)[0];
      }
    });

    nodesNotMarked = graph.filter((node) => !node.marked);
    nodesMarked = graph.filter((node) => node.marked);

    // let marked = nodesMarked.map((elem) => elem.summit);
    marked.push(maxVal.end);
    console.log(marked);
    container.classList.add("border");
    container.classList.add("w-full");
    container.classList.add("border-gray-800");
    container.classList.add("my-2");

    tempVal = [];
    document.getElementById("steps-element-max").appendChild(container);
    i++;
  }

  // Reconstruct the shortest path
  const longPath = [];
  let currentNode = graph.find((node) => node.summit === end);

  while (currentNode) {
    longPath.unshift(currentNode.summit);
    currentNode = currentNode.prev;
  }

  return { graph, path: longPath };
};

const selectMax = (val) => {
  let max = -Infinity;
  let node = null;
  val.forEach((elem) => {
    if (elem.value > max) {
      max = elem.value;
      node = elem;
    }
  });
  return node;
};

const selectMin = (val) => {
  let min = Infinity;
  let node = null;

  val.forEach((elem) => {
    if (elem.value <= min) {
      min = elem.value;
      node = elem;
    }
  });

  return node;
};

const isAllNodesMarked = (graph) => {
  graph.forEach((elem) => {
    if (!elem.marked) {
      return false;
    }
  });

  return true;
};
function areAllMarked(graph) {
  return graph.every((node) => node.marked);
}
