import os
import sys
from config import GRAPH_URL, TOKENS_URL, GRAPH_FILE, TOKENS_FILE, HOST, PORT
from src.utils import download
from src.loader import load_tokens, load_graph, compute_layout
from src.server import run_server


def main():
    update = "--update" in sys.argv

    if update or not os.path.exists(GRAPH_FILE) or not os.path.exists(TOKENS_FILE):
        download(GRAPH_URL, GRAPH_FILE)
        download(TOKENS_URL, TOKENS_FILE)

    tokens = load_tokens()
    graph = load_graph()

    g, pos, degree, filtered, duration, algorithm, filter_limit = compute_layout(tokens, graph)

    run_server(
        host=HOST,
        port=PORT,
        tokens=tokens,
        pos=pos,
        degree=degree,
        original_graph=graph,
        g=g,
        filtered=filtered,
        layout_duration=duration,
        layout_algorithm=algorithm,
        filter_limit=filter_limit,
    )


if __name__ == "__main__":
    main()
