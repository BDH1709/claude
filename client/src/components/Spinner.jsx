export default function Spinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
      <div className="w-10 h-10 border-4 border-pokemon-border border-t-pokemon-yellow rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
