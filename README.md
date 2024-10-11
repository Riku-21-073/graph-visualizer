# GraphVisualizer ライブラリ

## 概要

`GraphVisualizer` は、JavaScript を用いてノードとエッジのグラフを描画・操作できる軽量ライブラリです。ノードやエッジのハイライト、検索機能、物理シミュレーションによるノードの動きなどをサポートしており、キャンバス上でインタラクティブなグラフを表示できます。

本リポジトリには、以下の3つのファイルが含まれています。

1. `graph-visualizer.js`: ライブラリ本体
2. `graph-visualizer.css`: ライブラリのスタイルを定義
3. `sample.html`: ライブラリの使用例を示すサンプルHTMLファイル

## 利用方法

### 1. ファイルのダウンロード

リポジトリの内容をダウンロードまたはクローンし、以下のファイルを同一ディレクトリに配置します。

- `graph-visualizer.js`
- `graph-visualizer.css`
- `sample.html`

### 2. sample.html をブラウザで開く

`sample.html` を直接ブラウザで開くことで、`GraphVisualizer` ライブラリの動作を確認できます。以下の手順で動作確認を行ってください。

1. `sample.html` をダブルクリックしてブラウザで開きます。
2. ブラウザ上でグラフが描画され、ノードとエッジが表示されます。
3. ノードをクリックすると、右側の情報パネルにノードの詳細が表示されます。
4. 検索バーにノード名を入力して「検索」ボタンを押すと、該当するノードがハイライトされます。
5. 「ハイライト解除」ボタンを押すと、検索ハイライトが解除されます。

### 3. ファイルの構造

- **graph-visualizer.js**  
  `GraphVisualizer` クラスを提供し、キャンバス上でのグラフ描画や物理シミュレーション、ノードとエッジのインタラクションを制御します。

- **graph-visualizer.css**  
  ノード情報パネルや検索バーなど、インターフェースのスタイルを定義します。

- **sample.html**  
  ライブラリの使用例を示すサンプルファイルです。ブラウザで開くことで、グラフの描画と操作を体験できます。

## サンプルコード

以下は、`sample.html` の抜粋で、`GraphVisualizer` の基本的な使い方を示します。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Graph Visualizer ライブラリの使用例</title>
  <link rel="stylesheet" href="graph-visualizer.css">
</head>
<body>
  <div id="graphSection">
    <canvas id="graphCanvas"></canvas>
    <div id="infoPanel">
      <h2>詳細情報</h2>
      <div id="infoContent">ノードやエッジをクリックしてください。</div>
    </div>
    <div id="searchBar">
      <input type="text" id="searchInput" placeholder="ノードを検索">
      <button id="searchButton">検索</button>
      <button id="clearSearchButton">ハイライト解除</button>
    </div>
  </div>

  <script type="module">
    import { GraphVisualizer } from './graph-visualizer.js';

    // GraphVisualizer インスタンスを作成
    const graph = new GraphVisualizer("graphCanvas", {
      showGuideAxes: true,
      nodeRadius: 20,
      highlightSearchColor: "#f1c40f"
    });

    // ノードとエッジの追加
    graph.addGraphNode("A");
    graph.addGraphNode("B");
    graph.addGraphEdge("A", "B", "関連性");

    graph.addGraphNode("C");
    graph.addGraphEdge("A", "C", "関連性");

    graph.addGraphNode("D");
    graph.addGraphEdge("C", "D", "関連性");

    graph.addGraphNode("E");
    graph.addGraphEdge("D", "E", "関連性");

    graph.addGraphNode("F");
    graph.addGraphEdge("E", "F", "関連性");

    // ノードが選択されたときの処理
    graph.onNodeSelect((node) => {
      const infoContent = document.getElementById("infoContent");
      let infoHtml = `<strong>ノード:</strong> ${node.label}<br><br>`;
      const relatedEdges = graph.edgesList.filter(edge => edge.source.id === node.id || edge.target.id === node.id);
      infoHtml += `<strong>関連する関係性:</strong><ul>`;
      relatedEdges.forEach(edge => {
        infoHtml += `<li>${edge.label} → ${edge.target.label}</li>`;
      });
      infoHtml += `</ul>`;
      infoContent.innerHTML = infoHtml;
    });

    // 検索機能
    document.getElementById("searchButton").addEventListener("click", () => {
      const query = document.getElementById("searchInput").value.trim();
      graph.searchAndHighlight(query);
    });

    // ハイライト解除
    document.getElementById("clearSearchButton").addEventListener("click", () => {
      graph.clearSearchHighlights();
      document.getElementById("infoContent").innerHTML = "ノードやエッジをクリックしてください。";
    });
  </script>
</body>
</html>
```

## GraphVisualizer クラスの仕様

### 1. コンストラクタ

```javascript
new GraphVisualizer(canvasId, options = {})
```

- `canvasId`: グラフを描画するための `<canvas>` 要素のID。
- `options`: 以下のオプションで描画をカスタマイズできます。
  - `desiredDistance` (default: 150): エッジ間の理想的な距離。
  - `minDistance` (default: 50): エッジ間の最小距離。
  - `edgeSpringConstant` (default: 0.1): エッジによる引力のバネ定数。
  - `repulsionForce` (default: 5000): ノード間の反発力。
  - `maxNodeSpeed` (default: 10): ノードの最大速度。
  - `projectionDistance` (default: 1000): 3D空間の視点からの距離。
  - `nodeRadius` (default: 15): ノードの半径。
  - `nodeColor` (default: "#3498db"): ノードの色。
  - `nodeHighlightColor` (default: "#e74c3c"): 強調表示されたノードの色。
  - `highlightSearchColor` (default: "#f1c40f"): 検索によってハイライトされたノードの色。
  - `edgeColor` (default: "#95a5a6"): エッジの色。
  - `edgeHighlightColor` (default: "#e74c3c"): 強調表示されたエッジの色。

### 2. メソッド

- `addGraphNode(label, fixed = false)`: ノードを追加します。`fixed` が `true` の場合、そのノードは固定され、物理シミュレーションの影響を受けません。
- `addGraphEdge(sourceLabel, targetLabel, predicate)`: ノード間にエッジ（関係性）を追加します。
- `onNodeSelect(callback)`: ノードが選択された際に呼び出されるコールバック関数を設定します。
- `onCanvasClick(callback)`: キャンバスがクリックされた際に呼び出されるコールバック関数を設定します。
- `searchAndHighlight(query)`: 検索クエリに一致するノードをハイライトします。
- `clearSearchHighlights()`: 検索によるハイライトを解除します。
- `clearAllHighlights()`: すべてのハイライトを解除します。

### 3. イベントリスナー

`GraphVisualizer` はカスタムイベントをサポートしており、次のようにリスナーを設定できます。

- ノードが選択された場合:
  
  ```javascript
  graph.onNodeSelect((node) => {
    console.log("選択されたノード:", node);
  });
  ```

- キャンバスがクリックされた場合:

  ```javascript
  graph.onCanvasClick((coords) => {
    console.log("キャンバスがクリックされました:", coords);
  });
  ```

## 検索機能

`searchAndHighlight` メソッドを使用して、特定のノードを検索し、部分一致するノードをハイライトすることができます。また、`clearSearchHighlights` メソッドでハイライトを解除することが可能です。

---
