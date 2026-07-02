import '@testing-library/jest-dom'

// jsdom doesn't support scrollIntoView
Element.prototype.scrollIntoView = () => {}
