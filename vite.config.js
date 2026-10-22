import {defineConfig} from "vite"; import react from "@vitejs/plugin-react";
// host: true lets a phone on the same Wi-Fi open the studio and scan the QR code.
export default defineConfig({plugins:[react()], server:{host:true, port:5173, strictPort:true}});
