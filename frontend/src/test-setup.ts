import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// jsdom doesn't support scrollIntoView
Element.prototype.scrollIntoView = () => {}
