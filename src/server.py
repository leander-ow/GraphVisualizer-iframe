from flask import Flask, request, jsonify, send_from_directory

from src.utils import get_file_datetime_str
from config import GRAPH_FILE, SIDEBAR_LIST_LIMIT, VISIBLE_LIMIT


def build_initial_state(
    tokens,
    pos,
    degree,
    original_graph,
    filtered,
    layout_duration,
    layout_algorithm,
    filter_limit,
):
    return {
        "tokens": tokens,
        "pos": pos.tolist(),
        "degree": degree.tolist(),
        "original_graph": {f"{k[0]},{k[1]}": v for k, v in original_graph.items()},
        "filtered": filtered.tolist(),
        "layout_duration": float(layout_duration),
        "layout_algorithm": layout_algorithm,
        "filter_limit": int(filter_limit),
        "context_count": len(original_graph),
        "token_count": len(tokens),
        "graph_file_date": get_file_datetime_str(GRAPH_FILE),
        "sidebar_list_limit": SIDEBAR_LIST_LIMIT,
        "visible_limit": VISIBLE_LIMIT,
    }


def run_server(
    host,
    port,
    tokens,
    pos,
    degree,
    original_graph,
    g,
    filtered,
    layout_duration,
    layout_algorithm,
    filter_limit,
):
    app = Flask(__name__, static_folder="../web", static_url_path="")

    state = {
        "tokens": tokens,
        "pos": pos,
        "degree": degree,
        "original_graph": original_graph,
        "g": g,
        "filtered": filtered,
        "layout_duration": layout_duration,
        "layout_algorithm": layout_algorithm,
        "filter_limit": filter_limit,
    }

    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.get("/api/state")
    def api_state():
        token = request.args.get("token")

        payload = build_initial_state(
            state["tokens"],
            state["pos"],
            state["degree"],
            state["original_graph"],
            state["filtered"],
            state["layout_duration"],
            state["layout_algorithm"],
            state["filter_limit"],
        )

        if token and token in state["tokens"]:
            payload["selected_token"] = token
            payload["selected_index"] = state["tokens"].index(token)

        return jsonify(payload)

    app.run(host=host, port=port, debug=False)
