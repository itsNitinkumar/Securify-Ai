// Quick test to check step data structure
const testFinding = {
  id: 1,
  title: "Test Finding",
  steps_to_reproduce: [
    {
      stepNumber: 1,
      description: "Step 1 description",
      image: "data:image/png;base64,test",
      caption: "Test caption"
    },
    {
      stepNumber: 2,
      description: "Step 2 description",
      image: "",
      caption: ""
    }
  ]
};

console.log('Test finding:', JSON.stringify(testFinding, null, 2));
console.log('Steps type:', typeof testFinding.steps_to_reproduce);
console.log('Is array:', Array.isArray(testFinding.steps_to_reproduce));
console.log('First step:', testFinding.steps_to_reproduce[0]);
console.log('First step type:', typeof testFinding.steps_to_reproduce[0]);
console.log('Has stepNumber:', 'stepNumber' in testFinding.steps_to_reproduce[0]);

// Test normalization logic
const steps = testFinding.steps_to_reproduce;
if (Array.isArray(steps) && steps.length > 0 && typeof steps[0] === 'object' && steps[0] !== null && 'stepNumber' in steps[0]) {
  console.log('✅ Would be recognized as new format');
  const normalized = steps.map((step) => ({
    stepNumber: step.stepNumber || 0,
    description: String(step.description || '').trim(),
    image: step.image,
    caption: step.caption
  }));
  console.log('Normalized:', normalized);
} else {
  console.log('❌ Would NOT be recognized as new format');
}
