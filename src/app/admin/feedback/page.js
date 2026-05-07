import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSessionSiteAdmin } from "@/lib/site-admins";
import { redirect } from "next/navigation";
import fs from "fs/promises";
import path from "path";

export const metadata = {
  title: "Admin Feedback Dashboard | ProHealthLedger",
};

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session || !isSessionSiteAdmin(session)) {
    redirect("/");
  }

  let feedbacks = [];
  try {
    const filePath = path.join(process.cwd(), "data", "feedback.json");
    const data = await fs.readFile(filePath, "utf8");
    feedbacks = JSON.parse(data);
    // Sort by timestamp descending
    feedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (err) {
    console.error("Failed to read feedbacks:", err);
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>User Feedback Dashboard</h1>
        <p>Total Submissions: {feedbacks.length}</p>
      </div>

      <div className="feedback-list-container">
        {feedbacks.length === 0 ? (
          <div className="empty-state">No feedback received yet.</div>
        ) : (
          <div className="feedback-table-wrapper">
            <table className="feedback-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Recommend</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((f, idx) => (
                  <tr key={idx} className={`type-${f.type}`}>
                    <td className="td-date">
                      {new Date(f.timestamp).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-muted">
                        {new Date(f.timestamp).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="td-user">
                      <div className="user-info">
                        <span className="user-name">{f.display_name}</span>
                        <span className="user-handle">{f.user_id}</span>
                      </div>
                    </td>
                    <td className="td-type">
                      <span className={`badge badge-${f.type}`}>
                        {f.type}
                      </span>
                    </td>
                    <td className="td-message">
                      <div className="message-content">{f.message}</div>
                    </td>
                    <td className="td-recommend">
                      {f.recommend ? (
                        <span className="recommend-yes">✅ Yes</span>
                      ) : (
                        <span className="recommend-no">❌ No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-container {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .admin-header {
          margin-bottom: 30px;
          border-bottom: 2px solid var(--border);
          padding-bottom: 20px;
        }
        .admin-header h1 {
          color: var(--accent);
          margin-bottom: 8px;
        }
        .feedback-table-wrapper {
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .feedback-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }
        .feedback-table th {
          text-align: left;
          padding: 16px;
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          color: #475569;
        }
        .feedback-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          vertical-align: top;
        }
        .td-date { white-space: nowrap; }
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-weight: 700; color: var(--text); }
        .user-handle { font-size: 0.8rem; color: var(--text-muted); }
        
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-bug { background: #fee2e2; color: #991b1b; }
        .badge-suggestion { background: #dcfce7; color: #166534; }
        .badge-praise { background: #fef9c3; color: #854d0e; }
        .badge-other { background: #f1f5f9; color: #475569; }
        
        .message-content {
          line-height: 1.5;
          color: var(--text-secondary);
          max-width: 500px;
        }
        .recommend-yes { color: #166534; font-weight: 600; }
        .recommend-no { color: #991b1b; font-weight: 600; }
        
        .text-xs { font-size: 0.75rem; }
        .text-muted { color: var(--text-muted); }
        
        @media (max-width: 768px) {
          .feedback-table-wrapper { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}
