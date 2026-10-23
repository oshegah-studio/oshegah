import { useParams } from "react-router-dom";
import PublicProfile from "./PublicProfile";
import SerialRedirect from "./SerialRedirect";

/** Card serial URLs (/OSH-XXXXXXXX) resolve through the card system; everything else is a username. */
export const SERIAL_URL = /^OSH-[A-Z0-9]{8}$/i;

export default function ProfileOrSerial() {
  const { username = "" } = useParams();
  return SERIAL_URL.test(username) ? <SerialRedirect serial={username.toUpperCase()} /> : <PublicProfile />;
}
