// src/components/shared/Navigation/Navbar.tsx
interface NavItem {
  label: string;
  href: string;
}

interface NavbarProps {
  menuItems: NavItem[]; // 페이지마다 달라지는 메뉴 목록
  rightElement?: React.ReactNode; // 로그인 버튼 혹은 프로필 아이콘
}

export default function Navbar({ menuItems, rightElement }: NavbarProps) {
  return (
    <nav className="h-16 border-b flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <h1 className="text-xl font-black italic text-indigo-600">OneTake</h1>
        <ul className="flex gap-6">
          {menuItems.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div>{rightElement}</div>
    </nav>
  );
}