import { useEffect, useState } from "react";
import dataJson from "./data.json";

const Mention = ({ color, children }) => (
  <span
    className="px-1 py-0.5 rounded text-white text-sm inline-block"
    style={{ backgroundColor: color }}
  >
    {children}
  </span>
);

const RichText = ({ nodes = [], forcePlain = false }) =>
  nodes.map((node, i) => {
    if (!node) return null;
    if (typeof node === "string") return <span key={i}>{node}</span>;
    if (node.type === "mention") {
      return (
        <Mention key={i} color={node.color}>
          {node.children?.map((child, j) => (
            <RichText key={j} nodes={[child]} forcePlain={forcePlain} />
          ))}
        </Mention>
      );
    }

    const Tag =
      node.type === "h1"
        ? "h1"
        : node.type === "h4"
        ? "h4"
        : node.type === "p"
        ? "p"
        : "span";

    const className = `
      ${!forcePlain && node.bold ? "font-bold" : ""}
      ${!forcePlain && node.underline ? "underline" : ""}
      ${Tag === "h1" ? "text-4xl mb-6" : ""}
      ${Tag === "h4" ? "text-base mb-2" : ""}
    `;

    return (
      <Tag key={i} className={className}>
        {node.children ? (
          <RichText nodes={node.children} forcePlain={forcePlain} />
        ) : (
          node.text
        )}
      </Tag>
    );
  });

const Clause = ({ data, clauseIndex }) => {
  let subClauseCounter = 0;

  const getTextContent = (nodes) =>
    nodes
      ?.map((n) => (typeof n.text === "string" ? n.text : ""))
      .join("")
      .trim();

  const normalize = (str) =>
    str?.toUpperCase().replace(/[\s.:]/g, "") || "";

  const stripEnd = (str) => str?.replace(/[.:]+$/, "") || "";

  return (
    <div className="my-4">
      {data?.title && (
        <p className="font-bold mb-2">
          {typeof clauseIndex === "number" ? `${clauseIndex + 1}. ` : ""}
          {data.title}
        </p>
      )}

      {data?.children?.map((item, i) => {
        if (item.type === "h4") {
          const normalizedTitle = normalize(stripEnd(data?.title));
          const filteredChildren = item.children?.filter((c) => {
            if (typeof c.text !== "string") return true;
            return normalize(stripEnd(c.text)) !== normalizedTitle;
          });

          if (!filteredChildren || filteredChildren.length === 0) return null;

          return (
            <div key={i} className="mb-2 whitespace-pre-wrap">
              <RichText
                nodes={filteredChildren}
                forcePlain={data?.title === "Definitions"}
              />
            </div>
          );
        }

        if (item.type === "p") {
          const pText = getTextContent(item.children);
          if (
            normalize(stripEnd(pText)) === normalize(stripEnd(data?.title))
          )
            return null;

          return (
            <div key={i} className="mb-2 whitespace-pre-wrap">
              <RichText
                nodes={item.children}
                forcePlain={data?.title === "Definitions"}
              />
            </div>
          );
        }

        if (item.type === "ul") {
          return (
            <ul key={i} className="list-disc pl-6 space-y-1">
              {item.children?.map((li, j) => (
                <li key={j}>
                  <RichText nodes={li.children?.[0]?.children || []} />
                </li>
              ))}
            </ul>
          );
        }

        if (item.type === "clause") {
          const p = item.children?.find((c) => c.type === "p");
          subClauseCounter += 1;
          return (
            <div key={i} className="pl-4 my-2 whitespace-pre-wrap">
              <span className="font-bold mr-1 inline-block">
                ({String.fromCharCode(96 + subClauseCounter)})
              </span>
              <span className="inline">
                <RichText nodes={p?.children || []} forcePlain={true} />
              </span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

const RenderBlock = ({ block }) => {
  const clauseTitles = [
    "Key Details",
    "Definitions",
    "Agreement to Provide Services",
  ];

  if (block.type === "h1") {
    return (
      <h1 className="text-4xl font-bold mb-6">
        <RichText nodes={block.children} />
      </h1>
    );
  }

  if (block.type === "p" && block.children?.[0]?.type === "clause") {
    return block.children.map((child, i) => (
      <Clause key={i} data={child} clauseIndex={2} />
    ));
  }

  if (block.type === "p") {
    return (
      <div className="mb-2 whitespace-pre-wrap">
        <RichText nodes={block.children} />
      </div>
    );
  }

  if (block.type === "block" && block.title === "Parties") {
    const content = block.children?.[0]?.children || [];

    const lines = [];
    let currentLine = [];

    content.forEach((node) => {
      if (typeof node.text === "string" && node.text.includes("\n")) {
        const parts = node.text.split(/\n+/);
        parts.forEach((part, idx) => {
          if (idx > 0 && currentLine.length) {
            lines.push(currentLine);
            currentLine = [];
          }
          if (part) currentLine.push({ ...node, text: part });
        });
      } else {
        currentLine.push(node);
      }
    });

    if (currentLine.length) lines.push(currentLine);

    const filteredLines = lines.filter(
      (line) =>
        !(
          line.length === 1 &&
          typeof line[0].text === "string" &&
          line[0].text.trim().toUpperCase() === block.title.toUpperCase()
        )
    );

    return (
      <div className="mb-4">
        <p className="font-bold uppercase">{block.title}</p>
        {filteredLines.map((line, i) => (
          <div key={i} className="mb-1">
            <RichText nodes={line} />
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "clause") {
    const clauseIndex = clauseTitles.indexOf(block.title);
    return (
      <Clause
        data={block}
        clauseIndex={clauseIndex !== -1 ? clauseIndex : undefined}
      />
    );
  }

  return null;
};

const App = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    setData(dataJson?.[0]?.children || []);
  }, []);

  return (
    <div className="flex justify-center p-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-3xl p-6 bg-white text-gray-800 shadow rounded space-y-6">
        {data.map((block, i) => (
          <RenderBlock key={i} block={block} />
        ))}
      </div>
    </div>
  );
};

export default App;