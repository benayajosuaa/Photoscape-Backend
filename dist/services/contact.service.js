import { sendEmail } from "../utils/mailer.js";
import { validateEmail } from "../utils/validator.js";
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function normalizeSubject(value) {
    const cleaned = value.replace(/[\r\n]+/g, " ").trim();
    return cleaned.slice(0, 120);
}
function getContactReceiverEmail() {
    return (process.env.CONTACT_RECEIVER_EMAIL?.trim() ||
        process.env.MAIL_USER?.trim() ||
        "photoscape.studiofoto@gmail.com");
}
export const ContactServices = {
    async sendMessage(payload) {
        const name = String(payload.name ?? "").trim();
        const email = String(payload.email ?? "").trim();
        const subjectRaw = String(payload.subject ?? "").trim();
        const message = String(payload.message ?? "").trim();
        if (name.length < 2)
            throw new Error("Nama minimal 2 karakter");
        if (!validateEmail(email))
            throw new Error("Email tidak valid");
        if (message.length < 10)
            throw new Error("Pesan minimal 10 karakter");
        if (message.length > 4000)
            throw new Error("Pesan terlalu panjang (maks 4000 karakter)");
        const receiver = getContactReceiverEmail();
        const subject = normalizeSubject(subjectRaw || "Contact Us - Photoscape");
        const sentAt = new Date().toISOString();
        const text = [
            "Contact Us Message",
            `Sent at: ${sentAt}`,
            "",
            `Name: ${name}`,
            `Email: ${email}`,
            subjectRaw ? `Subject: ${subjectRaw}` : undefined,
            "",
            message,
        ]
            .filter(Boolean)
            .join("\n");
        const html = `
      <h2>Contact Us Message</h2>
      <p><b>Sent at:</b> ${escapeHtml(sentAt)}</p>
      <p><b>Name:</b> ${escapeHtml(name)}<br/>
         <b>Email:</b> ${escapeHtml(email)}${subjectRaw ? `<br/><b>Subject:</b> ${escapeHtml(subjectRaw)}` : ""}</p>
      <pre style="white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHtml(message)}</pre>
    `.trim();
        await sendEmail({
            to: receiver,
            subject,
            text,
            html,
        });
        return { ok: true };
    },
};
//# sourceMappingURL=contact.service.js.map