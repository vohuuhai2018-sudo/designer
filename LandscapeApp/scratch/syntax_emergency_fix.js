import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// The problematic block is from 1117 ending to the next useEffect or const declaration
// It looks like:
//   }, [selectedProject]);
// 
//       if (event.source !== designerFrameRef.current?.contentWindow) return;
// ...
//   }, [selectedProject]);

const garbageStart = `  }, [selectedProject]);

      if (event.source !== designerFrameRef.current?.contentWindow) return;`;

const garbageEnd = `    window.addEventListener('message', handleDesignerMessage);
    return () => window.removeEventListener('message', handleDesignerMessage);
  }, [selectedProject]);`;

// We want to keep the FIRST '}, [selectedProject]);' but remove everything after it until the next one.
// Actually, let's just use a more surgical approach.

const searchString = `  }, [selectedProject]);

      if (event.source !== designerFrameRef.current?.contentWindow) return;`;

const nextValidPart = `  const workflowOptions: Array<{`;

// Find where the garbage starts and where the next valid part begins
const startIndex = c.indexOf(searchString);
const endIndex = c.indexOf(nextValidPart);

if (startIndex !== -1 && endIndex !== -1) {
    // Keep the first '  }, [selectedProject]);'
    const preservedPart = c.substring(0, startIndex + 26); // length of "  }, [selectedProject]);"
    const finalPart = c.substring(endIndex);
    c = preservedPart + "\n\n" + finalPart;
}

fs.writeFileSync('src/App.tsx', c);
