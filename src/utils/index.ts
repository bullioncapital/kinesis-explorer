import moment from 'moment'

export function flatten(...items: any[]): any[] {
  return [].concat(...items)
}

export function renderRelativeDate(date: Date | string): string {
  const parsedDate = moment(date, moment.ISO_8601)
  return moment(parsedDate).fromNow()
}