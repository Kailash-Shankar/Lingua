import Chat from "@/components/Chat";

export default function StudentChatPage({ params }) {
  const { studentId, chatId } = params;

  return (
    <Chat studentId={studentId} chatId={chatId} />
  );
}