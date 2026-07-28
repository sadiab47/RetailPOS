import { authService } from '../lib/auth';

export default function LogoutButton() {
  return (
    <button
      onClick={() => authService.logout()}
      className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-sm font-semibold text-slate-100 transition-colors"
    >
      Sign Out
    </button>
  );
}
