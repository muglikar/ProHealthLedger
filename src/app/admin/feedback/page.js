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

    </div>
  );
}
