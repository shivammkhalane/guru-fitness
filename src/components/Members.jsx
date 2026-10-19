import { MoreHorizontal, Pencil, Plus, Search } from 'lucide-react'
import { getInitials } from '../utils/gymLogic'

const getStatusClass = (status) => {
  if (status === 'Active') {
    return 'members-status-active inline-flex items-center rounded-md border border-zinc-900 bg-zinc-900 px-2 py-0.5 text-xs font-medium text-zinc-50'
  }
  if (status === 'Expired' || status === 'Inactive') {
    return 'members-status-inactive inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500'
  }
  if (status === 'Expiring Soon') {
    return 'members-status-expiring inline-flex items-center rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-500'
  }
  return 'members-status-other inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500'
}

export default function Members({
  members,
  totalCount,
  searchQuery,
  onSearchChange,
  filterOptions,
  memberFilter,
  onFilterChange,
  currentPage,
  pageCount,
  pageSize,
  onPageChange,
  onAddMember,
  onSelectMember,
  onEditMember,
  getMembershipStatus,
  formatDate,
  children,
}) {
  const firstVisibleMember = totalCount ? (currentPage - 1) * pageSize + 1 : 0
  const lastVisibleMember = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="members-page flex-1 space-y-6 overflow-y-auto bg-zinc-50 p-6">
      <header className="members-header">
        <div className="members-header-title">
          <p>Member directory</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Members</h1>
        </div>
        <div className="members-header-actions">
          <button
            type="button"
            className="members-add-button bg-zinc-900 hover:bg-zinc-900/90 text-zinc-50 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm inline-flex items-center justify-center"
            onClick={onAddMember}
          >
            <Plus size={17} aria-hidden="true" />
            Add Member
          </button>
        </div>
      </header>

      <div className="members-table-card bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="members-table-toolbar">
          <label className="members-search flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search members..."
              aria-label="Search members by name, phone, or member ID"
            />
          </label>
          <div className="members-filters" aria-label="Filter members by membership status">
            {filterOptions.map((option) => (
              <button
                type="button"
                key={option}
                className={`members-filter ${memberFilter === option ? 'is-active' : ''}`}
                aria-pressed={memberFilter === option}
                onClick={() => onFilterChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="members-table-scroll">
          <table className="members-table w-full caption-bottom text-sm">
            <thead className="border-b border-zinc-200">
              <tr>
                <th className="h-10 px-4 text-left align-middle font-medium text-zinc-500">Member</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-zinc-500">Member ID</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-zinc-500">Membership</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-zinc-500">Expires</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-zinc-500">Status</th>
                <th className="h-10 px-4 text-right align-middle font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length ? members.map((member) => {
                const status = getMembershipStatus(member)
                return (
                  <tr
                    key={member.memberId}
                    className="border-b border-zinc-200 transition-colors hover:bg-zinc-100/50"
                  >
                    <td className="p-4 align-middle text-zinc-950">
                      <div className="members-person">
                        <span className="members-avatar h-8 w-8 rounded-full border border-zinc-200 bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-700">
                          {getInitials(member.name || 'GF')}
                        </span>
                        <div className="members-person-copy">
                          <button type="button" className="members-name text-sm font-medium text-zinc-950" onClick={() => onSelectMember(member.memberId)}>
                            {member.name}
                          </button>
                          <span className="members-contact text-xs text-zinc-500">{member.phone || member.email || 'No contact information'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-zinc-950 members-id">#{member.memberId}</td>
                    <td className="p-4 align-middle text-zinc-950 members-plan">{member.plan || '—'}</td>
                    <td className="p-4 align-middle text-zinc-950 members-expiry">{formatDate(member.expiryDate)}</td>
                    <td className="p-4 align-middle text-zinc-950">
                      <span className={getStatusClass(status)}>{status}</span>
                    </td>
                    <td className="p-4 align-middle text-zinc-950">
                      <div className="members-row-actions">
                        <button
                          type="button"
                          className="members-action text-zinc-500 hover:text-zinc-950 p-1.5 hover:bg-zinc-100 rounded-md transition-colors"
                          aria-label={`Edit ${member.name}`}
                          title="Edit member"
                          onClick={() => onEditMember(member)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="members-action text-zinc-500 hover:text-zinc-950 p-1.5 hover:bg-zinc-100 rounded-md transition-colors"
                          aria-label={`View ${member.name}`}
                          title="View member details"
                          onClick={() => onSelectMember(member.memberId)}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td className="members-empty" colSpan="6">
                    <strong>No members match your current filter.</strong>
                    <span>Try another search or select All to see every member.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <nav className="members-pagination" aria-label="Member list pages">
            <span>{firstVisibleMember}–{lastVisibleMember} of {totalCount}</span>
            <div>
              <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Previous</button>
              <span aria-current="page">Page {currentPage} of {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}>Next</button>
            </div>
          </nav>
        )}
      </div>

      {children}
    </div>
  )
}
