import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  text: string;
  isUser: boolean;
}

interface ChartSuggestion {
  type: string;
  x_axis: string;
  y_axis: string;
  title: string;
}

const App: React.FC = () => {
  const [sessionId] = useState<string>(uuidv4());
  const [query, setQuery] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [matplotlibCode, setMatplotlibCode] = useState<string | null>(null);
  const [suggestedCharts, setSuggestedCharts] = useState<ChartSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSuggestedCharts();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const fetchSuggestedCharts = async () => {
    try {
      const response = await axios.get<{ suggested_charts: ChartSuggestion[] }>(
        "http://localhost:8000/suggest_charts"
      );
      console.log("Suggested charts:", response.data.suggested_charts);
      setSuggestedCharts(response.data.suggested_charts);
    } catch (error) {
      console.error("Error fetching suggested charts:", error);
      setError("Failed to fetch suggested charts. Please try again.");
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { text: query, isUser: true },
    ]);
    setQuery("");
    setIsTyping(true);

    try {
      const response = await axios.post<{ response: string }>(
        "http://localhost:8000/query",
        { text: query, session_id: sessionId }
      );
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: response.data.response, isUser: false },
      ]);
    } catch (error) {
      console.error("Error querying data:", error);
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = `Error: ${error.response.status} - ${error.response.data.detail || error.message}`;
      }
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: errorMessage, isUser: false },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateChart = async (chartSuggestion: ChartSuggestion) => {
    setError(null);
    setChartImage(null);
    setMatplotlibCode(null);
    setIsTyping(true);
    
    try {
      console.log("Generating chart with suggestion:", chartSuggestion);
      const response = await axios.post<{ chart_data: string; matplotlib_code: string }>(
        "http://localhost:8000/generate_chart",
        chartSuggestion
      );
      console.log("Received chart data:", response.data);
      
      if (response.data.chart_data) {
        setChartImage(`data:image/png;base64,${response.data.chart_data}`);
      } else {
        setError("Received empty chart data from the server.");
      }
      
      setMatplotlibCode(response.data.matplotlib_code);
    } catch (error) {
      console.error("Error generating chart:", error);
      if (axios.isAxiosError(error) && error.response) {
        setError(`Error generating chart: ${error.response.status} - ${error.response.data.detail || error.message}`);
      } else {
        setError("Failed to generate chart. Please try again.");
      }
    } finally {
      setIsTyping(false);
    }
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 text-gray-400">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Chat Section */}
      <div className="w-1/2 p-6 flex flex-col border-r border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">NASA OSD Research Chat</h1>
        <div className="flex-grow overflow-auto mb-6 rounded-lg bg-gray-800 p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 p-3 rounded-lg ${
                message.isUser ? "bg-blue-600 ml-auto" : "bg-gray-700"
              } max-w-3/4`}
            >
              {message.isUser ? (
                message.text
              ) : (
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={atomDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="mb-4 p-3 rounded-lg bg-gray-700 max-w-3/4">
              <TypingIndicator />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex bg-gray-800 rounded-lg overflow-hidden">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleQuery()}
            placeholder="Ask about NASA OSD research..."
            className="flex-grow bg-transparent p-3 focus:outline-none"
            disabled={isTyping}
          />
          <button
            onClick={handleQuery}
            className={`bg-blue-500 text-white px-6 py-3 transition-colors ${
              isTyping ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
            disabled={isTyping}
          >
            Send
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-1/2 p-6 flex flex-col">
        <h1 className="text-3xl font-bold mb-6 text-green-400">Data Visualization</h1>
        <div className="mb-6 grid grid-cols-2 gap-4">
          {suggestedCharts.map((chart, index) => (
            <button
              key={index}
              onClick={() => handleGenerateChart(chart)}
              className={`bg-green-600 text-white p-3 rounded-lg transition-colors ${
                isTyping ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
              disabled={isTyping}
            >
              {chart.title}
            </button>
          ))}
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded-lg">
            {error}
          </div>
        )}
        {chartImage && (
          <div className="flex-grow bg-gray-800 rounded-lg p-4 overflow-auto">
            <img src={chartImage} alt="Generated Chart" className="w-full h-auto" />
            {matplotlibCode && (
              <div className="mt-4">
                <h2 className="text-xl font-bold mb-2">Matplotlib Code:</h2>
                <SyntaxHighlighter language="python" style={atomDark}>
                  {matplotlibCode}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;