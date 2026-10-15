from langgraph.graph import END, StateGraph

from src.agents.nodes.rag_nodes import analyze_node, respond_node
from src.agents.state import AgentState
from src.safety.nodes import protect_analyze, protect_respond


def should_continue(state: AgentState) -> str:
    """Route based on whether an error occurred during analysis."""
    if state.get("error"):
        return END
    return "respond"


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("analyze", protect_analyze(analyze_node))
    graph.add_node("respond", protect_respond(respond_node))

    # Add edges: analyze -> respond -> END
    graph.set_entry_point("analyze")
    graph.add_edge("analyze", "respond")
    graph.add_edge("respond", END)

    return graph.compile()


agent = build_graph()
