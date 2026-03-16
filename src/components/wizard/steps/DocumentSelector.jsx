// src/components/wizard/steps/DocumentSelector.jsx

import { DOCUMENT_REGISTRY } from '../../../data/documentRegistry';

export default function DocumentSelector({ onSelect, onBack }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  const categories = {
    governance: DOCUMENT_REGISTRY.filter(d => d.category === 'governance'),
    initiation: DOCUMENT_REGISTRY.filter(d => d.category === 'initiation'),
    execution: DOCUMENT_REGISTRY.filter(d => d.category === 'execution')
  };
  
  function handleContinue() {
    if (!selectedDoc) return;
    onSelect(selectedDoc); // Pass docId to parent
  }
  
  return (
    <div>
      <h2>Select Document Type</h2>
      
      {/* Governance Documents */}
      <div>
        <h3>📊 Governance Documents</h3>
        {categories.governance.map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            selected={selectedDoc === doc.id}
            onClick={() => setSelectedDoc(doc.id)}
            disabled={!doc.enabled}
          />
        ))}
      </div>
      
      {/* Initiation Documents */}
      <div>
        <h3>📜 Initiation Documents</h3>
        {categories.initiation.map(doc => (
          <DocumentCard key={doc.id} doc={doc} ... />
        ))}
      </div>
      
      {/* Execution Documents */}
      <div>
        <h3>📋 Execution Documents</h3>
        {categories.execution.map(doc => (
          <DocumentCard key={doc.id} doc={doc} ... />
        ))}
      </div>
      
      <button onClick={handleContinue} disabled={!selectedDoc}>
        Continue to Document Wizard
      </button>
    </div>
  );
}