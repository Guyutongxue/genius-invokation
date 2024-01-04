import { render } from "preact";
import { Chessboard } from "../src/chessboard";
import "../src/index.css";
import "virtual:uno.css";

render(<Chessboard />, document.getElementById("root")!);
