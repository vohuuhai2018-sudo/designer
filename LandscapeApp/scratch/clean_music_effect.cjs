const fs = require('fs');
const f = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let lines = fs.readFileSync(f, 'utf8').split('\n');

const newEffect = [
    "  useEffect(() => {",
    "    const isAuto = service === 'Gói Cơ Bản' || service === 'Gói Cơ bản' || service === 'Gói Nâng cao';",
    "    if (!isAuto) return;",
    "    const isDone = project?.status === 'done';",
    "",
    "    // NHẠC CHỜ TẠM TẮT THEO YÊU CẦU",
    "    if (!isDone) {",
    "      // Disabled logic",
    "    } else {",
    "      // FORCE STOP / FADE OUT",
    "      const stopMusic = () => {",
    "        if (!audioRef.current) return;",
    "        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);",
    "        ",
    "        fadeIntervalRef.current = setInterval(() => {",
    "          if (audioRef.current) {",
    "            if (audioRef.current.volume > 0.1) {",
    "              audioRef.current.volume -= 0.1;",
    "            } else {",
    "              audioRef.current.pause();",
    "              audioRef.current.volume = 0.2;",
    "              audioRef.current.currentTime = 0;",
    "              clearInterval(fadeIntervalRef.current);",
    "              fadeIntervalRef.current = null;",
    "            }",
    "          } else {",
    "            clearInterval(fadeIntervalRef.current);",
    "            fadeIntervalRef.current = null;",
    "          }",
    "        }, 100);",
    "      };",
    "      stopMusic();",
    "    }",
    "",
    "    return () => {",
    "      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);",
    "      if (audioRef.current) {",
    "        audioRef.current.pause();",
    "        audioRef.current.currentTime = 0;",
    "      }",
    "    };",
    "  }, [project?.status, service]);"
];

// Replace from line 4772 to 4832 (index 4771 to 4831)
lines.splice(4771, 4832 - 4772 + 1, ...newEffect);

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log("SUCCESS");
