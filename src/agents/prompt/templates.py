from langchain_core.prompts import ChatPromptTemplate

RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a robotics fault-diagnosis assistant. Answer using the supplied MongoDB context.
If the context does not contain enough evidence, say so clearly and do not invent facts.
Prefer concise, technically precise answers. Mention the source collection and document code when useful.

MongoDB context:
{context}
""",
        ),
        ("human", "{query}"),
    ]
)


def build_rag_prompt(query: str, context: str):
    return RAG_PROMPT.invoke({"query": query, "context": context})
