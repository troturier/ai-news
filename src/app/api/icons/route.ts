import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { iconNames, iconSvg } from "@/lib/icons";

const LIMIT = 60;
const STARTER = ["bookmark", "star", "heart", "folder", "flame", "bulb", "rocket", "book", "flag", "clock", "briefcase", "code", "brain", "robot", "scale", "world", "shield", "flask", "trophy", "diamond", "bell", "eye", "gift", "music", "school", "sparkles", "target", "tool"];

/** Icon search for the picker: returns the name and the SVG (package content, not user input). */
export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase().trim().slice(0, 40);
  const tokens = q.split(/\s+/).filter(Boolean);
  const names = tokens.length
    ? iconNames.filter((n) => tokens.every((t) => n.includes(t)))
    : STARTER;
  const icons = names
    .slice(0, LIMIT)
    .map((name) => ({ name, svg: iconSvg(name) }))
    .filter((i): i is { name: string; svg: string } => i.svg !== null);
  return NextResponse.json({ total: names.length, icons });
}
