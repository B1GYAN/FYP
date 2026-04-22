import { Link } from "react-router-dom";
import logoImage from "../assets/papertrade-logo.png";

export default function AppLogoLink({ variant = "header" }) {
  return (
    <Link
      to="/dashboard"
      className={`app-logo-link app-logo-link-${variant}`}
      aria-label="Go to dashboard"
    >
      <img
        src={logoImage}
        alt="PaperTrade logo"
        className={`app-logo-image app-logo-image-${variant}`}
      />
    </Link>
  );
}
