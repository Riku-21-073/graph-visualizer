// graph-visualizer.js

export class GraphVisualizer {
    /**
     * @param {string} canvasId - グラフを描画するキャンバスのID。
     * @param {Object} options - グラフの表示オプション。
     */
    constructor(canvasId, options = {}) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
        throw new Error(`Canvas with id "${canvasId}" not found.`);
      }
      this.ctx = this.canvas.getContext("2d");
      this.resizeCanvasDimensions();
  
      // デフォルトオプションの設定
      this.options = Object.assign({
        desiredDistance: 150,               // エッジの理想距離
        minDistance: 50,                    // エッジの最小距離
        edgeSpringConstant: 0.1,            // エッジのバネ定数
        repulsionForce: 5000,               // ノード間の反発力
        maxNodeSpeed: 10,                   // ノードの最大移動速度
        projectionDistance: 1000,           // 投影距離
        minProjectionDenominator: 1,        // 投影の分母の最小値
        nodeRadius: 15,                     // ノードの半径
        nodeColor: "#3498db",               // ノードの基本色
        nodeHighlightColor: "#e74c3c",      // 強調表示されたノードの色
        edgeColor: "#95a5a6",               // エッジの基本色
        edgeHighlightColor: "#e74c3c",      // 強調表示されたエッジの色
        font: "12px sans-serif",            // テキストのフォント
        showGuideAxes: false,               // ガイド軸の表示オプション
        highlightSearchColor: "#f1c40f",    // 検索ハイライト色
      }, options);
  
      // データ構造
      this.nodesMap = {};
      this.edgesList = [];
      this.highlightedNodesList = [];
      this.selectedNode = null;
      this.draggingNode = false;
  
      // 物理シミュレーションのパラメータ
      this.desiredDistance = this.options.desiredDistance;
      this.minDistance = this.options.minDistance;
      this.edgeSpringConstant = this.options.edgeSpringConstant;
      this.repulsionForce = this.options.repulsionForce;
      this.maxNodeSpeed = this.options.maxNodeSpeed;
  
      // パン & ズーム & 回転の変数
      this.scale = 1.0;
      this.cameraOffsetX = 0;
      this.cameraOffsetY = 0;
      this.panning = false;
      this.panStart = { x: 0, y: 0 };
  
      // 3D回転の角度
      this.cameraRotationX = 0;
      this.cameraRotationY = 0;
      this.rotating = false;
      this.rotateStart = { x: 0, y: 0 };
  
      // イベントハンドラーのバインド
      this.handleResize = this.resizeCanvasDimensions.bind(this);
      this.handleMouseDown = this.onMouseDown.bind(this);
      this.handleMouseMove = this.onMouseMove.bind(this);
      this.handleMouseUp = this.onMouseUp.bind(this);
      this.handleWheel = this.onWheelZoom.bind(this);
  
      // イベントリスナーの追加
      window.addEventListener("resize", this.handleResize);
      this.canvas.addEventListener("mousedown", this.handleMouseDown);
      this.canvas.addEventListener("mousemove", this.handleMouseMove);
      this.canvas.addEventListener("mouseup", this.handleMouseUp);
      this.canvas.addEventListener("mouseleave", this.handleMouseUp);
      this.canvas.addEventListener("wheel", this.handleWheel);
      this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  
      // 初期化
      this.startSimulationLoop();
    }
  
    /**
     * キャンバスのサイズを親要素に合わせてリサイズします。
     */
    resizeCanvasDimensions() {
      this.canvas.width = this.canvas.parentElement.clientWidth;
      this.canvas.height = this.canvas.parentElement.clientHeight;
    }
  
    /**
     * 新しいノードを追加します。
     * @param {string} label - ノードのラベル。
     * @param {boolean} fixed - ノードを固定するかどうか。
     * @returns {Object} 追加されたノードオブジェクト。
     */
    addGraphNode(label, fixed = false) {
      if (!this.nodesMap[label]) {
        this.nodesMap[label] = {
          id: label,
          label: label,
          x: Math.random() * 400 - 200,
          y: Math.random() * 400 - 200,
          z: Math.random() * 400 - 200,
          vx: 0,
          vy: 0,
          vz: 0,
          fixed: fixed,
          highlighted: false,
          searchHighlighted: false,
        };
      }
      return this.nodesMap[label];
    }
  
    /**
     * 新しいエッジを追加します。
     * @param {string} sourceLabel - ソースノードのラベル。
     * @param {string} targetLabel - ターゲットノードのラベル。
     * @param {string} predicate - エッジのラベル。
     */
    addGraphEdge(sourceLabel, targetLabel, predicate) {
      const sourceNode = this.addGraphNode(sourceLabel);
      const targetNode = this.addGraphNode(targetLabel);
      this.edgesList.push({
        source: sourceNode,
        target: targetNode,
        label: predicate,
        highlighted: false,
      });
    }
  
    /**
     * グラフ内の全ノードとエッジをクリアします。
     */
    clearGraphData() {
      this.nodesMap = {};
      this.edgesList = [];
      this.highlightedNodesList = [];
      this.selectedNode = null;
    }
  
    /**
     * ノードの位置を更新します（物理シミュレーション）。
     */
    updateNodePositions() {
      const nodeArray = Object.values(this.nodesMap);
  
      // ノードの速度をリセット
      nodeArray.forEach((node) => {
        if (!node.fixed) {
          node.vx = 0;
          node.vy = 0;
          node.vz = 0;
        }
      });
  
      // ノード間の反発力を計算
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const nodeA = nodeArray[i];
          const nodeB = nodeArray[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dz = nodeB.z - nodeA.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
          const force = this.repulsionForce / (distance * distance);
  
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          const fz = (dz / distance) * force;
  
          if (!nodeA.fixed) {
            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeA.vz -= fz;
          }
          if (!nodeB.fixed) {
            nodeB.vx += fx;
            nodeB.vy += fy;
            nodeB.vz += fz;
          }
        }
      }
  
      // エッジによる引力を計算
      this.edgesList.forEach((edge) => {
        const nodeA = edge.source;
        const nodeB = edge.target;
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dz = nodeB.z - nodeA.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
  
        let force = 0;
  
        if (distance > this.desiredDistance) {
          force = this.edgeSpringConstant * (distance - this.desiredDistance);
        } else if (distance < this.minDistance) {
          force = -this.edgeSpringConstant * (this.minDistance - distance);
        }
  
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force;
  
        if (!nodeA.fixed) {
          nodeA.vx += fx;
          nodeA.vy += fy;
          nodeA.vz += fz;
        }
        if (!nodeB.fixed) {
          nodeB.vx -= fx;
          nodeB.vy -= fy;
          nodeB.vz -= fz;
        }
      });
  
      // ノードの速度を制限
      nodeArray.forEach((node) => {
        if (!node.fixed) {
          const speed = Math.sqrt(node.vx ** 2 + node.vy ** 2 + node.vz ** 2);
          if (speed > this.maxNodeSpeed) {
            const scale = this.maxNodeSpeed / speed;
            node.vx *= scale;
            node.vy *= scale;
            node.vz *= scale;
          }
        }
      });
  
      // ノードの位置を更新
      nodeArray.forEach((node) => {
        if (!node.fixed) {
          node.x += node.vx;
          node.y += node.vy;
          node.z += node.vz;
  
          // ノードの z 座標を制限
          node.z = Math.max(node.z, -this.options.projectionDistance + this.options.minProjectionDenominator);
        }
      });
    }
  
    /**
     * 3D座標を2Dスクリーン座標に投影します。
     * @param {Object} node - 投影するノードオブジェクト。
     * @returns {Object} 投影後の座標とスケール。
     */
    project(node) {
      const distance = this.options.projectionDistance;
      let denominator = distance + node.z;
  
      if (denominator < this.options.minProjectionDenominator) {
        denominator = this.options.minProjectionDenominator;
      }
  
      const projectionScale = distance / denominator;
      const x = (node.x * projectionScale + this.cameraOffsetX) * this.scale + this.canvas.width / 2;
      const y = (node.y * projectionScale + this.cameraOffsetY) * this.scale + this.canvas.height / 2;
  
      return { x, y, scale: projectionScale * this.scale };
    }
  
    /**
     * グラフを描画します。
     */
    drawGraph() {
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0); // トランスフォームをリセット
  
      // 背景をクリア
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
      // 3D回転行列の計算
      const cosRotX = Math.cos(this.cameraRotationX);
      const sinRotX = Math.sin(this.cameraRotationX);
      const cosRotY = Math.cos(this.cameraRotationY);
      const sinRotY = Math.sin(this.cameraRotationY);
  
      // エッジの描画
      this.edgesList.forEach((edge) => {
        const source = { ...edge.source };
        const target = { ...edge.target };
  
        // 回転X
        let y = source.y * cosRotX - source.z * sinRotX;
        let z = source.y * sinRotX + source.z * cosRotX;
        source.y = y;
        source.z = z;
  
        y = target.y * cosRotX - target.z * sinRotX;
        z = target.y * sinRotX + target.z * cosRotX;
        target.y = y;
        target.z = z;
  
        // 回転Y
        let x = source.x * cosRotY + source.z * sinRotY;
        z = -source.x * sinRotY + source.z * cosRotY;
        source.x = x;
        source.z = z;
  
        x = target.x * cosRotY + target.z * sinRotY;
        z = -target.x * sinRotY + target.z * cosRotY;
        target.x = x;
        target.z = z;
  
        // 投影
        const projectedSource = this.project(source);
        const projectedTarget = this.project(target);
  
        // エッジを描画
        this.ctx.beginPath();
        this.ctx.moveTo(projectedSource.x, projectedSource.y);
        this.ctx.lineTo(projectedTarget.x, projectedTarget.y);
        this.ctx.strokeStyle = edge.highlighted ? this.options.edgeHighlightColor : this.options.edgeColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
  
        // 述語ラベルの描画
        const midX = (projectedSource.x + projectedTarget.x) / 2;
        const midY = (projectedSource.y + projectedTarget.y) / 2;
  
        // エッジの角度を計算
        const angle = Math.atan2(
          projectedTarget.y - projectedSource.y,
          projectedTarget.x - projectedSource.x
        );
  
        // ラベルの位置を調整（エッジの上に少しオフセット）
        const labelOffset = 10;
        const labelX = midX + labelOffset * Math.sin(angle);
        const labelY = midY - labelOffset * Math.cos(angle);
  
        // テキストの背景を描画
        const text = edge.label;
        this.ctx.font = this.options.font;
        const textMetrics = this.ctx.measureText(text);
        const padding = 2;
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        this.ctx.fillRect(
          labelX - textMetrics.width / 2 - padding,
          labelY - 7 - padding,
          textMetrics.width + padding * 2,
          14 + padding * 2
        );
  
        // テキストを描画
        this.ctx.fillStyle = "#2c3e50";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(text, labelX, labelY);
      });
  
      // ノードの描画
      Object.values(this.nodesMap).forEach((node) => {
        const rotatedNode = { ...node };
  
        // 回転X
        let y = rotatedNode.y * cosRotX - rotatedNode.z * sinRotX;
        let z = rotatedNode.y * sinRotX + rotatedNode.z * cosRotX;
        rotatedNode.y = y;
        rotatedNode.z = z;
  
        // 回転Y
        let x = rotatedNode.x * cosRotY + rotatedNode.z * sinRotY;
        z = -rotatedNode.x * sinRotY + rotatedNode.z * cosRotY;
        rotatedNode.x = x;
        rotatedNode.z = z;
  
        // 投影
        const projected = this.project(rotatedNode);
  
        // projection.scale が正の場合のみ描画
        if (projected.scale > 0) {
          // ノードを描画
          this.ctx.beginPath();
          this.ctx.arc(projected.x, projected.y, this.options.nodeRadius * projected.scale, 0, 2 * Math.PI);
          // ハイライト色の優先順位: 検索ハイライト > 通常ハイライト > 通常色
          if (node.searchHighlighted) {
            this.ctx.fillStyle = this.options.highlightSearchColor;
          } else {
            this.ctx.fillStyle = node.highlighted ? this.options.nodeHighlightColor : this.options.nodeColor;
          }
          this.ctx.fill();
          this.ctx.strokeStyle = "#2c3e50";
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
  
          // ノードラベルの描画
          this.ctx.fillStyle = "#2c3e50";
          this.ctx.font = this.options.font;
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(
            rotatedNode.label,
            projected.x,
            projected.y - 25 * projected.scale
          );
        }
      });
  
      // ガイド軸の描画（オプション）
      if (this.options.showGuideAxes) {
        this.drawGuideAxes(cosRotX, sinRotX, cosRotY, sinRotY);
      }
  
      this.ctx.restore();
    }
  
    /**
     * ガイド軸を描画します。
     * @param {number} cosRotX - 回転Xのコサイン値。
     * @param {number} sinRotX - 回転Xのサイン値。
     * @param {number} cosRotY - 回転Yのコサイン値。
     * @param {number} sinRotY - 回転Yのサイン値。
     */
    drawGuideAxes(cosRotX, sinRotX, cosRotY, sinRotY) {
      const axisLength = 100; // ガイド軸の長さ（画面固定）
      const originScreenX = 110; // ガイド軸の原点（画面左上）
      const originScreenY = 110;
  
      // 定義されたガイド軸の情報
      const axes = [
        { x: axisLength, y: 0, z: 0, color: "#e74c3c", label: "X" }, // X軸: 赤
        { x: 0, y: axisLength, z: 0, color: "#2ecc71", label: "Y" }, // Y軸: 緑
        { x: 0, y: 0, z: axisLength, color: "#3498db", label: "Z" }, // Z軸: 青
      ];
  
      axes.forEach((axis) => {
        // 回転X
        let y = axis.y * cosRotX - axis.z * sinRotX;
        let z = axis.y * sinRotX + axis.z * cosRotX;
  
        // 回転Y
        let x = axis.x * cosRotY + z * sinRotY;
        z = -axis.x * sinRotY + z * cosRotY;
  
        // 投影（ズームに影響されないように scale を適用しない）
        const distance = this.options.projectionDistance;
        const projectionScale = distance / (distance + z);
        const endX = x * projectionScale + originScreenX;
        const endY = y * projectionScale + originScreenY;
  
        // ガイド軸を描画
        this.ctx.beginPath();
        this.ctx.moveTo(originScreenX, originScreenY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = axis.color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
  
        // ガイド軸のラベルを描画
        this.ctx.fillStyle = axis.color;
        this.ctx.font = "12px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(axis.label, endX, endY);
      });
    }
  
    /**
     * シミュレーションループを開始します。
     */
    startSimulationLoop() {
      const simulation = () => {
        this.updateNodePositions();
        this.drawGraph();
        requestAnimationFrame(simulation);
      };
      requestAnimationFrame(simulation);
    }
  
    /**
     * マウスの位置を取得します。
     * @param {MouseEvent} event - マウスイベント。
     * @returns {Object} マウスの座標。
     */
    getMousePosition(event) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
  
    /**
     * マウスダウンイベントハンドラー。
     * @param {MouseEvent} event - マウスイベント。
     */
    onMouseDown(event) {
      const mousePos = this.getMousePosition(event);
      const mouseX = mousePos.x;
      const mouseY = mousePos.y;
  
      // ノードがクリックされたか確認
      this.selectedNode = null;
      this.draggingNode = false;
  
      // 3D座標を2Dに投影してノードをチェック
      Object.values(this.nodesMap).forEach((node) => {
        const rotatedNode = { ...node };
  
        // 回転X
        let y = rotatedNode.y * Math.cos(this.cameraRotationX) - rotatedNode.z * Math.sin(this.cameraRotationX);
        let z = rotatedNode.y * Math.sin(this.cameraRotationX) + rotatedNode.z * Math.cos(this.cameraRotationX);
        rotatedNode.y = y;
        rotatedNode.z = z;
  
        // 回転Y
        let x = rotatedNode.x * Math.cos(this.cameraRotationY) + rotatedNode.z * Math.sin(this.cameraRotationY);
        z = -rotatedNode.x * Math.sin(this.cameraRotationY) + rotatedNode.z * Math.cos(this.cameraRotationY);
        rotatedNode.x = x;
        rotatedNode.z = z;
  
        const projected = this.project(rotatedNode);
  
        const dx = mouseX - projected.x;
        const dy = mouseY - projected.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
  
        if (distance < this.options.nodeRadius * projected.scale) {
          this.selectedNode = node;
          this.draggingNode = true;
          node.fixed = true;
        }
      });
  
      // パンまたは回転操作の開始
      if (!this.draggingNode) {
        if (event.button === 0) {
          // 左クリックで回転
          this.rotating = true;
          this.rotateStart = { x: event.clientX, y: event.clientY };
        } else if (event.button === 2) {
          // 右クリックでパン
          this.panning = true;
          this.panStart = { x: event.offsetX, y: event.offsetY };
          this.canvas.style.cursor = "grabbing";
        }
      }
  
      // カスタムイベントの発火
      if (this.selectedNode) {
        this.dispatchEvent('nodeSelected', this.selectedNode);
      } else {
        this.dispatchEvent('canvasClicked', { x: mouseX, y: mouseY });
      }
    }
  
    /**
     * マウスムーブイベントハンドラー。
     * @param {MouseEvent} event - マウスイベント。
     */
    onMouseMove(event) {
      if (this.draggingNode && this.selectedNode) {
        const mousePos = this.getMousePosition(event);
        const newX = (mousePos.x - this.canvas.width / 2) / this.scale;
        const newY = (mousePos.y - this.canvas.height / 2) / this.scale;
        this.selectedNode.x = newX - this.cameraOffsetX / this.scale;
        this.selectedNode.y = newY - this.cameraOffsetY / this.scale;
      } else if (this.rotating) {
        const dx = event.clientX - this.rotateStart.x;
        const dy = event.clientY - this.rotateStart.y;
        this.cameraRotationY += dx * 0.005;
        this.cameraRotationX += dy * 0.005;
        this.rotateStart = { x: event.clientX, y: event.clientY };
      } else if (this.panning) {
        const dx = event.offsetX - this.panStart.x;
        const dy = event.offsetY - this.panStart.y;
        this.cameraOffsetX += dx / this.scale;
        this.cameraOffsetY += dy / this.scale;
        this.panStart = { x: event.offsetX, y: event.offsetY };
      }
    }
  
    /**
     * マウスアップイベントハンドラー。
     * @param {MouseEvent} event - マウスイベント。
     */
    onMouseUp(event) {
      if (this.draggingNode && this.selectedNode) {
        this.selectedNode.fixed = false;
      }
      this.draggingNode = false;
  
      if (this.rotating) {
        this.rotating = false;
      }
  
      if (this.panning) {
        this.panning = false;
        this.canvas.style.cursor = "grab";
      }
    }
  
    /**
     * マウスホイールイベントハンドラー（ズーム）。
     * @param {WheelEvent} event - ホイールイベント。
     */
    onWheelZoom(event) {
      event.preventDefault();
  
      const zoomIntensity = 0.1;
      const wheel = event.deltaY < 0 ? 1 : -1;
      const zoomFactor = Math.exp(wheel * zoomIntensity);
  
      this.scale *= zoomFactor;
  
      // ズームレベルの制限
      this.scale = Math.min(Math.max(0.1, this.scale), 5);
    }
  
    /**
     * カスタムイベントをディスパッチします。
     * @param {string} eventName - イベント名。
     * @param {any} detail - イベントに含める詳細情報。
     */
    dispatchEvent(eventName, detail) {
      const customEvent = new CustomEvent(eventName, { detail });
      this.canvas.dispatchEvent(customEvent);
    }
  
    /**
     * カスタムイベントのリスナーを追加します。
     * @param {string} eventName - イベント名。
     * @param {Function} callback - イベントハンドラー。
     */
    on(eventName, callback) {
      this.canvas.addEventListener(eventName, callback);
    }
  
    /**
     * ノードが選択されたときに呼び出されるコールバックを設定します。
     * @param {Function} callback - 選択されたノードを処理する関数。
     */
    onNodeSelect(callback) {
      this.on('nodeSelected', (event) => callback(event.detail));
    }
  
    /**
     * キャンバスがクリックされたときに呼び出されるコールバックを設定します。
     * @param {Function} callback - クリック位置を処理する関数。
     */
    onCanvasClick(callback) {
      this.on('canvasClicked', (event) => callback(event.detail));
    }
  
    /**
     * ノードをハイライトします。
     * @param {string} label - ハイライトするノードのラベル。
     */
    highlightNodeByLabel(label) {
      this.clearSearchHighlights();
  
      const node = this.nodesMap[label];
      if (node) {
        node.searchHighlighted = true;
        this.highlightedNodesList.push(node);
        this.dispatchEvent('nodeSelected', node);
      }
    }
  
    /**
     * 複数のノードをハイライトします（部分一致）。
     * @param {string} query - 検索クエリ。
     */
    searchNodes(query) {
      this.clearSearchHighlights();
  
      const lowerCaseQuery = query.toLowerCase();
      Object.values(this.nodesMap).forEach((node) => {
        if (node.label.toLowerCase().includes(lowerCaseQuery)) {
          node.searchHighlighted = true;
          this.highlightedNodesList.push(node);
        }
      });
  
      if (this.highlightedNodesList.length > 0) {
        // 最初のハイライトされたノードを選択
        this.dispatchEvent('nodeSelected', this.highlightedNodesList[0]);
      } else {
        this.dispatchEvent('canvasClicked', { x: 0, y: 0 });
      }
    }
  
    /**
     * 検索およびハイライトを実行します。
     * @param {string} query - 検索クエリ。
     */
    searchAndHighlight(query) {
      if (!query) {
        this.clearSearchHighlights();
        this.dispatchEvent('canvasClicked', { x: 0, y: 0 });
        return;
      }
      this.searchNodes(query);
    }
  
    /**
     * すべての検索ハイライトをクリアします。
     */
    clearSearchHighlights() {
      Object.values(this.nodesMap).forEach((node) => {
        node.searchHighlighted = false;
      });
      this.highlightedNodesList = [];
    }
  
    /**
     * すべてのハイライトをクリアします。
     */
    clearAllHighlights() {
      Object.values(this.nodesMap).forEach((node) => {
        node.highlighted = false;
        node.searchHighlighted = false;
      });
      this.highlightedNodesList = [];
    }
  }
  