import { LedgerRecord, TransactionRecord } from 'js-kinesis-sdk'
import * as React from 'react'
import { RouteComponentProps } from 'react-router'
import { Subscribe } from 'unstated'
import {
  ConnectionContainer,
  ConnectionContext,
} from '../../services/connections'
import {
  getLedgers,
  getLedgerStream,
  getTransactions,
  getTransactionStream,
} from '../../services/kinesis'
import { Converter, Ledgers, Statistics, Transactions } from '../widgets'

interface ConnectedDashboardProps extends RouteComponentProps<undefined> {}
interface DashboardProps extends ConnectedDashboardProps, ConnectionContext {}

interface DashboardState {
  ledgers: LedgerRecord[]
  transactions: TransactionRecord[]
  isLoading: boolean
}

enum Entity {
  ledgers = 'ledgers',
  transactions = 'transactions',
}

type EntityType = keyof typeof Entity

class Dashboard extends React.Component<DashboardProps, DashboardState> {
  state = {
    ledgers: [],
    transactions: [],
    isLoading: false,
  }

  closeLedgerStream!: () => void
  closeTransactionStream!: () => void

  componentDidMount() {
    this.fetchData()
  }

  componentDidUpdate(prevProps: DashboardProps) {
    if (prevProps.selectedConnection !== this.props.selectedConnection) {
      this.handleConnectionChange()
    }
  }

  componentWillUnmount() {
    this.closeDataStreams()
  }

  fetchData = async (): Promise<void> => {
    this.setState({ isLoading: true })
    const [ledgers, transactions] = await Promise.all([
      getLedgers(this.props.selectedConnection),
      getTransactions(this.props.selectedConnection),
    ])

    this.setState({ ledgers, transactions, isLoading: false })

    const ledgerCursor: string = (ledgers[0] || {}).paging_token
    const transactionCursor: string = (transactions[0] || {}).paging_token

    const ledgerResponse = await getLedgerStream(
      this.props.selectedConnection,
      ledgerCursor,
    )
    const transactionResponse = await getTransactionStream(
      this.props.selectedConnection,
      transactionCursor,
    )

    this.closeLedgerStream = ledgerResponse.stream({
      onmessage: this.handleStreamData(Entity.ledgers),
    })
    this.closeTransactionStream = transactionResponse.stream({
      onmessage: this.handleStreamData(Entity.transactions),
    })
  }

  closeDataStreams = (): void => {
    if (this.closeTransactionStream) {
      this.closeTransactionStream()
    }
    if (this.closeLedgerStream) {
      this.closeLedgerStream()
    }
  }

  handleLoadData = (dataType: EntityType) => (
    initialData: LedgerRecord[] | TransactionRecord[],
  ): void => {
    this.setState((state: DashboardState) => ({
      ...state,
      [dataType]: initialData,
    }))
  }

  handleStreamData = (dataType: EntityType) => (
    nextData: LedgerRecord | TransactionRecord,
  ): void => {
    this.setState((state: DashboardState) => {
      const updatedData = [nextData, ...state[dataType].slice(0, 9)]
      return {
        ...state,
        [dataType]: updatedData,
      }
    })
  }

  handleConnectionChange = (): void => {
    this.closeDataStreams()
    this.fetchData()
  }

  render() {
    return (
      <section className='section'>
        <div className='tile is-ancestor'>
          <div className='tile is-vertical is-4 is-parent'>
            <Statistics />
            <Converter />
          </div>
          <div className='tile is-vertical is-parent'>
            <article className='tile is-child'>
              <p className='title'>Ledgers</p>
              <div className={this.state.isLoading ? 'is-loading-blur' : ''}>
                <Ledgers ledgers={this.state.ledgers} />
              </div>
            </article>
            <article className='tile is-child'>
              <p className='title'>Transactions</p>
              <div className={this.state.isLoading ? 'is-loading-blur' : ''}>
                <Transactions transactions={this.state.transactions} />
              </div>
            </article>
          </div>
        </div>
      </section>
    )
  }
}

class ConnectedDashboard extends React.Component<ConnectedDashboardProps> {
  render() {
    return (
      <Subscribe to={[ConnectionContainer]}>
        {({ state }: ConnectionContainer) => (
          <Dashboard {...this.props} {...state} />
        )}
      </Subscribe>
    )
  }
}

export default ConnectedDashboard
