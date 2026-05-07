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

  const getProfileLink = (userId) => {
    if (!userId) return null;
    if (userId.startsWith("github:")) {
      return `https://github.com/${userId.split(":")[1]}`;
    }
    if (userId.startsWith("linkedin:")) {
      const sub = userId.split(":")[1];
      // Try to find a profile with this slug/sub if we had a more robust mapping, 
      // but for now we can at least link to a search or a known pattern.
      // If the user has a vanity slug, we'd use that.
      return `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(sub)}`;
    }
    return null;
  };

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
                {feedbacks.map((f, idx) => {
                  const profileUrl = getProfileLink(f.user_id);
                  return (
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
                          {profileUrl ? (
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="user-link">
                              <span className="user-name">{f.display_name}</span>
                            </a>
                          ) : (
                            <span className="user-name">{f.display_name}</span>
                          )}
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
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
