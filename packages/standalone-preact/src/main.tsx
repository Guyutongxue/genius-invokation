import { render } from "preact";
import { Chessboard } from "@gi-tcg/webui";
import "./index.css";

render(<Chessboard />, document.getElementById("app")!);
