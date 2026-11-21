import React, { useState } from 'react';
import { ExternalLink, LifeBuoy, Loader2, MessageSquare, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { TicketCategory } from '../types/store';
import { validateMinecraftUsername } from '../utils/storeLogic';

export function SupportPage() {
  const {
    user,
    userProfile,
    signInWithGoogle,
    siteConfig,
    supportTickets,
    submitSupportTicket,
  } = useStore();

  const [mcUsername, setMcUsername] = useState(userProfile?.minecraftUsername || '');
  const [category, setCategory] = useState<TicketCategory>('Purchase Issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const ignCheck = validateMinecraftUsername(mcUsername);
    if (!ignCheck.valid) {
      setFeedback({ type: 'err', text: ignCheck.error || 'Enter a valid Minecraft username.' });
      return;
    }
    if (subject.trim().length < 3) {
      setFeedback({ type: 'err', text: 'Subject must be at least 3 characters.' });
      return;
    }
    if (message.trim().length < 10) {
      setFeedback({ type: 'err', text: 'Please describe your issue in at least 10 characters.' });
      return;
    }
    if (!user) {
      setFeedback({ type: 'err', text: 'Please sign in with Google first to submit a ticket.' });
      return;
    }

    setSubmitting(true);
    try {
      await submitSupportTicket({
        minecraftUsername: ignCheck.cleaned,
        category,
        subject,
        message,
      });
      setSubject('');
      setMessage('');
      setFeedback({
        type: 'ok',
        text: 'Support ticket submitted! Staff will respond directly in your ticket feed below.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to submit support ticket.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="volex-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-300 mb-1">
            <LifeBuoy className="w-4 h-4" aria-hidden="true" />
            <span>Player Assistance</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            VOLEXMC Support Center
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Need help with a pending rank, payment verification, or server bug? Submit a ticket below.
          </p>
        </div>

        <a
          href={siteConfig.discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="volex-glow-btn px-5 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <span>Join Discord Support</span>
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Submit Ticket Form */}
        <section className="lg:col-span-6 volex-panel rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white">
            Open a Support Ticket
          </h2>

          {!user && (
            <div className="p-3.5 rounded-xl bg-violet-600/15 border border-violet-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-violet-100">
                Sign in with Google to submit and track support tickets.
              </span>
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 cursor-pointer shrink-0"
              >
                Sign in with Google
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="support-ign" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Minecraft Username
                </label>
                <input
                  id="support-ign"
                  type="text"
                  required
                  value={mcUsername}
                  onChange={(e) => setMcUsername(e.target.value)}
                  placeholder="Your exact IGN"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label htmlFor="support-cat" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Category
                </label>
                <select
                  id="support-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white focus:outline-none focus:border-violet-400"
                >
                  <option value="Purchase Issue">Purchase Issue</option>
                  <option value="Account & Rank">Account &amp; Rank</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Player Report">Player Report</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="support-subject" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Subject
              </label>
              <input
                id="support-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your request"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label htmlFor="support-message" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Details (include Order ID if applicable)
              </label>
              <textarea
                id="support-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question or issue clearly..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070918] border border-violet-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
              />
            </div>

            {feedback && (
              <div
                role="alert"
                className={`p-3 rounded-xl text-xs border ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/35 text-rose-200'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="volex-glow-btn px-5 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Submit Ticket</span>
            </button>
          </form>
        </section>

        {/* User's Tickets */}
        <section className="lg:col-span-6 volex-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              Your Support Tickets
            </h2>
          </div>

          {!user ? (
            <p className="text-sm text-slate-400">
              Sign in to view your submitted support tickets and staff responses.
            </p>
          ) : supportTickets.length === 0 ? (
            <p className="text-sm text-slate-400">
              You have no support tickets yet.
            </p>
          ) : (
            <div className="space-y-3">
              {supportTickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="p-4 rounded-xl bg-[#070918] border border-white/10 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-violet-300 font-semibold">
                        {tkt.category} · IGN: {tkt.minecraftUsername}
                      </div>
                      <h3 className="font-display text-sm font-bold text-white mt-0.5">
                        {tkt.subject}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-600/20 border border-violet-500/35 text-violet-200 shrink-0">
                      {tkt.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{tkt.message}</p>
                  {tkt.adminReply && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-100">
                      <span className="font-bold text-emerald-300">Staff Reply: </span>
                      {tkt.adminReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
