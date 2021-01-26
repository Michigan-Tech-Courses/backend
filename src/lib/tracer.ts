import tracer from 'dd-trace';
tracer.init({
	enabled: process.env.NODE_ENV === 'production'
}); // Initialized in a different file to avoid hoisting.
export default tracer;
